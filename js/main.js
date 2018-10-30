'use strict';

function getRandRgb()
{
    return Math.floor(Math.random() * 0x1000000);
}

function hexToRgbString(hex)
{
    var rgb = {
        r: hex >> 16 & 0xff,
        g: hex >> 8 & 0xff,
        b: hex & 0xff
    };

    return 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
}

var controls = document.getElementById('controls');
function createWave()
{
    var inputs = {
        amplitude: document.createElement('input'),
        period: document.createElement('input'),
        phase: document.createElement('input')
    }

    inputs.amplitude.type = 'range';
    inputs.amplitude.step = 0.01;
    inputs.amplitude.min = -1;
    inputs.amplitude.max = 1;
    inputs.amplitude.value = 0;

    inputs.period.type = 'range';
    inputs.period.step = 0.01;
    inputs.period.min = 0;
    inputs.period.max = 100;
    inputs.period.value = 1;

    inputs.phase.type = 'range';
    inputs.phase.step = 0.01;
    inputs.phase.min = -360;
    inputs.phase.max = 360;
    inputs.phase.value = 0;

    var waveColor = getRandRgb();
    window.waves.push({
        options:{color:waveColor},
        wave:{
            amplitude:inputs.amplitude.value,
            period:inputs.period.value,
            phase:inputs.phase.value
        }
    });
    var waveCount = window.waves.length - 1;

    inputs.amplitude.addEventListener('input', function()
    {
        waves[waveCount].wave.amplitude = this.value * (pixiApp.renderer.height / 2);
        broadcastWaveChange(this, waves[waveCount].wave);
    });
    inputs.period.addEventListener('input', function()
    {
        waves[waveCount].wave.period = +this.value;
        broadcastWaveChange(this, waves[waveCount].wave);
    });
    inputs.phase.addEventListener('input', function()
    {
        waves[waveCount].wave.phase = toRad(this.value);
        broadcastWaveChange(this, waves[waveCount].wave);
    });

    var controlContainer = document.createElement('div');
    controlContainer.classList.add('wave');
    controlContainer.style.backgroundColor = hexToRgbString(waveColor);
    for(var input in inputs)
    {
        if (!inputs.hasOwnProperty(input)) continue;
        controlContainer.appendChild(inputs[input]);
    }
    controls.appendChild(controlContainer);
}

function broadcastWaveChange(sender, wave)
{
    var event = new CustomEvent('waveChange', {detail:{sender:sender, wave:wave}});
    document.dispatchEvent(event);
}

function toRad(angle)
{
    return angle * Math.PI / 180;
}

function draw(delta, pixiApp)
{
    for(var waveId in waves)
    {
        var waveOptions = waves[waveId];
        var options = waveOptions.options;
        var wave = waveOptions.wave;
        var line = waveOptions.line;

        if (line)
        {
            line.clear();
        }
        else
        {
            line = waveOptions.line = new PIXI.Graphics();
        }

        line.lineStyle(1, options.color, 1);

        for(var angle = 0; angle < pixiApp.renderer.width-1; angle++)
        {
            var c = 360/pixiApp.renderer.width * wave.period;

            var y1 = Math.sin((toRad(angle) - (wave.phase/c)) * c);
            var y2 = Math.sin((toRad(angle+1) - (wave.phase/c)) * c);
            var shapedY1 = pixiApp.renderer.height/2 - (wave.amplitude * y1);
            var shapedY2 = pixiApp.renderer.height/2 - (wave.amplitude * y2);

            line.moveTo(angle, shapedY1);
            line.lineTo(angle+1, shapedY2);
        }
        pixiApp.stage.addChild(line);
    }
}

function resize(renderer)
{
    renderer.resize(document.body.clientWidth, document.body.clientWidth * 0.5625);
}

// default wave is additive of all user-created waves
window.waves = [{
    options:{color:0xffffff},
    wave:{
        amplitude:0,
        period:1,
        phase:0
    }
}];

var display = document.getElementById('display');
var pixiApp = new PIXI.Application({
    width: document.body.clientWidth,
    height: document. body.clientWidth * 0.5625,
    antialias: true,
    transparent: false,
    resolution: 1,

    backgroundColor:0x0
});

document.addEventListener('waveChange', function(e)
{
    //var wave = e.detail.wave;
    //window.waves[0].wave.amplitude += wave.amplitude;
    //window.waves[0].wave.period += wave.period;
    //window.waves[0].wave.phase += wave.phase;
});

document.getElementById('createwave').addEventListener('click', createWave);

window.addEventListener('resize', resize.bind(null, pixiApp.renderer));

display.appendChild(pixiApp.view);

pixiApp.ticker.add(delta => draw(delta, pixiApp));