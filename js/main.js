"use strict";

function getRandRgb() {
    return Math.floor(Math.random() * 0x1000000);
}

function hexToRgbString(hex) {
    let rgb = {
        r: (hex >> 16) & 0xff,
        g: (hex >> 8) & 0xff,
        b: hex & 0xff
    };

    return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
}

let controls = document.getElementById("controls");
function createWave() {
    let inputs = {
        amplitude: document.createElement("input"),
        period: document.createElement("input"),
        phase: document.createElement("input")
    };

    inputs.amplitude.type = "range";
    inputs.amplitude.step = 0.01;
    inputs.amplitude.min = -1;
    inputs.amplitude.max = 1;
    inputs.amplitude.value = 0;

    inputs.period.type = "range";
    inputs.period.step = 0.01;
    inputs.period.min = 0.01;
    inputs.period.max = 100;
    inputs.period.value = 1;

    inputs.phase.type = "range";
    inputs.phase.step = 0.01;
    inputs.phase.min = -360;
    inputs.phase.max = 360;
    inputs.phase.value = 0;

    let waveColor = getRandRgb();
    window.waves.push({
        options: { color: waveColor },
        wave: {
            amplitude: inputs.amplitude.value,
            period: inputs.period.value,
            phase: inputs.phase.value
        }
    });
    let waveCount = window.waves.length - 1;

    inputs.amplitude.addEventListener("input", function () {
        waves[waveCount].wave.amplitude =
            this.value * (pixiApp.renderer.height / 2);
    });
    inputs.period.addEventListener("input", function () {
        waves[waveCount].wave.period = +this.value;
    });
    inputs.phase.addEventListener("input", function () {
        waves[waveCount].wave.phase = toRad(this.value);
    });

    let controlContainer = document.createElement("div");
    controlContainer.classList.add("wave");
    controlContainer.style.backgroundColor = hexToRgbString(waveColor);
    let btn = document.createElement("button");
    btn.classList.add("wave-close");
    btn.onclick = () => {
        let wave = waves[waveCount];
        delete waves[waveCount];
        wave.line.clear();
        controls.removeChild(controlContainer);
        window.dispatchEvent(new Event("resize"));
    };
    controlContainer.appendChild(btn);
    let inputContainer = document.createElement("div");
    controlContainer.appendChild(inputContainer);
    for (let input of Object.entries(inputs)) {
        //if (!inputs.hasOwnProperty(input)) continue;
        let p = document.createElement('p');
        let span = document.createElement('span');
        span.innerText = input[0];
        p.appendChild(span);
        p.appendChild(input[1]);
        inputContainer.appendChild(p);
    }
    controls.appendChild(controlContainer);
    window.dispatchEvent(new Event("resize"));
}

function toRad(angle) {
    return (angle * Math.PI) / 180;
}

function getYFromAngleForWave(wave, angle) {
    if (!wave) throw new Error('Wave is empty!');

    let c = (360 / pixiApp.renderer.width) * wave.period;

    let y1 = Math.sin((toRad(angle) - wave.phase / c) * c) * wave.amplitude;
    let y2 = Math.sin((toRad(angle + 1) - wave.phase / c) * c) * wave.amplitude;
    
    return [y1, y2];
}

function drawLineSegmentFromAngle(y1, y2, angle, line, pixiApp) {
    line.moveTo(angle, pixiApp.renderer.height / 2 - y1);
    line.lineTo(angle + 1, pixiApp.renderer.height / 2 - y2);
}

function configureLineComponentForWave(wave) {
    if (wave.line) {
        wave.line.clear();
    } else {
        wave.line = new PIXI.Graphics();
    }
    
    wave.line.lineStyle(
        wave.options.width ?? 1,
        wave.options.color,
        1);
}

function draw(delta, pixiApp) {
    // draw wave 0
    configureLineComponentForWave(waves[0]);
    for (let angle = 0; angle < pixiApp.renderer.width - 1; angle++) {
        let y1 = 0;
        let y2 = 0;
        // wave 0 is additive of all other lines, so we take
        // the amplitude, period, and phase of each line and add them
        for (let wave of waves.slice(1)){
            if (!wave) continue;
            let y = getYFromAngleForWave(wave.wave, angle);
            y1 += y[0];
            y2 += y[1];
        }
        
        drawLineSegmentFromAngle(y1, y2, angle, waves[0].line, pixiApp);
    }
    pixiApp.stage.addChild(waves[0].line);
    
    // draw the other waves
    for (let wave of waves.slice(1)) {
        if (!wave) continue;
        
        configureLineComponentForWave(wave);

        for (let angle = 0; angle < pixiApp.renderer.width - 1; angle++) {
            let [y1, y2] = getYFromAngleForWave(wave.wave, angle);
            drawLineSegmentFromAngle(y1, y2, angle, wave.line, pixiApp);
        }
        
        pixiApp.stage.addChild(wave.line);
    }
}

function getWaveDisplayHeight() {
    return window.innerHeight - controls.clientHeight;
}

function resize(renderer) {
    renderer.resize(document.body.clientWidth, getWaveDisplayHeight());
}

window.waves = [
    {
        options: {
            width: 2,
            color: 0xffffff
        },
        wave: {
            amplitude: 0,
            period: 1,
            phase: 0
        }
    }
];

let display = document.getElementById("display");
let pixiApp = new PIXI.Application({
    width: document.body.clientWidth,
    height: getWaveDisplayHeight(),
    antialias: true,
    transparent: false,
    resolution: 1,

    backgroundColor: 0x0
});

document.getElementById("createwave").addEventListener("click", createWave);

window.addEventListener("resize", resize.bind(null, pixiApp.renderer));

display.appendChild(pixiApp.view);

pixiApp.ticker.add((delta) => draw(delta, pixiApp));
