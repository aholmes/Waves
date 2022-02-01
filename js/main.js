"use strict";

class Watcher {
    /* {
      containerid: [inputid, inputid, inputid],
      ...
    } */
    #containerInputs = {};
    inputs = {};
    
    constructor() {
        window.addEventListener("waveCreated", e => this.#addWave(e.detail.container.id, e.detail.container));
        window.addEventListener("waveRemoved", e => this.#removeWave(e.detail.container.id));
    }
    
    #addWave(id, container) {
        let containerInputs = [];
        for(let input of container.querySelectorAll('input[type="range"]'))
        {
            containerInputs.push(input.id);
            this.inputs[input.id] = input;
        }
        this.#containerInputs[id] = containerInputs;
    }

    #removeWave(id) {
        for (let inputId of this.#containerInputs[id]) {
            delete this.inputs[inputId]
        }
        delete this.#containerInputs[id];
    }
}
let watcher = new Watcher();

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
let wavesDiv = document.getElementById("waves");
let wave0Id = '0.000000';
let resizeEvent = new Event("resize");
function createWave() {
    let waveId = Math.random();
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
    inputs.amplitude.id = Math.random();
    inputs.amplitude.classList.add('amplitude');

    inputs.period.type = "range";
    inputs.period.step = 0.01;
    inputs.period.min = 0.01;
    inputs.period.max = 100;
    inputs.period.value = 1;
    inputs.period.id = Math.random();
    inputs.period.classList.add('period');

    inputs.phase.type = "range";
    inputs.phase.step = 0.01;
    inputs.phase.min = -360;
    inputs.phase.max = 360;
    inputs.phase.value = 0;
    inputs.phase.id = Math.random();
    inputs.phase.classList.add('phase');

    let waveColor = getRandRgb();
    window.waves[waveId] = {
        options: { color: waveColor },
        wave: {
            amplitude: inputs.amplitude.value,
            period: inputs.period.value,
            phase: inputs.phase.value
        }
    };

    inputs.amplitude.addEventListener("input", function () {
        waves[waveId].wave.amplitude =
            this.value * (pixiApp.renderer.height / 2);
    });
    inputs.period.addEventListener("input", function () {
        waves[waveId].wave.period = +this.value;
    });
    inputs.phase.addEventListener("input", function () {
        waves[waveId].wave.phase = toRad(this.value);
    });

    let controlContainer = document.createElement("div");
    controlContainer.id = waveId;
    controlContainer.classList.add("wave");
    controlContainer.style.backgroundColor = hexToRgbString(waveColor);
    let btn = document.createElement("button");
    btn.classList.add("wave-close");
    btn.onclick = () => {
        let wave = waves[waveId];
        delete waves[waveId];
        wave.line.clear();
        wavesDiv.removeChild(controlContainer);
        window.dispatchEvent(resizeEvent);
        window.dispatchEvent(new CustomEvent("waveRemoved", {
            detail: {
                sender: this,
                container: controlContainer
            }
        }));
    };
    controlContainer.appendChild(btn);
    let inputContainer = document.createElement("div");
    controlContainer.appendChild(inputContainer);
    for (let input of Object.entries(inputs)) {
        let p = document.createElement('p');
        let span = document.createElement('span');
        span.innerText = input[0];
        p.appendChild(span);
        p.appendChild(input[1]);
        inputContainer.appendChild(p);
    }
    wavesDiv.appendChild(controlContainer);
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new CustomEvent('waveCreated', {
        detail: {
            sender: this,
            container: controlContainer
        }
    }));
}

let registeredDrawFunctions = new Set();


let hideControlWaves = false;
function toggleWaveVisibility(e) {
    e.target.innerText = hideControlWaves ? e.target.dataset['hideText'] :e. target.dataset['showText'];
    hideControlWaves = !hideControlWaves;
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

function configureLineComponentForWave(wave, forceVisibile = false) {
    if (wave.line) {
        wave.line.clear();
    } else {
        wave.line = new PIXI.Graphics();
    }
    
    wave.line.lineStyle(
        wave.options.width ?? 1,
        wave.options.color,
        forceVisibile
            ? 1
            : hideControlWaves ? 0 : 1);
}

function draw(delta, pixiApp) {
    // draw wave 0
    configureLineComponentForWave(waves[wave0Id], true);
    
    let wavesArray = Object.values(waves).slice(1);
    // divisor is used to scale wave 0 so it doesn't clip
    let divisor = wavesArray.length === 0 ? 1 : wavesArray.length;
    for (let angle = 0; angle < pixiApp.renderer.width - 1; angle++) {
        let y1 = 0;
        let y2 = 0;
        // wave 0 is additive of all other lines, so we take
        // the amplitude, period, and phase of each line and add them
        for (let wave of wavesArray){
            if (!wave) continue;

            let y = getYFromAngleForWave(wave.wave, angle);
            y1 += y[0];
            y2 += y[1];
        }
        
        drawLineSegmentFromAngle(y1/divisor, y2/divisor, angle, waves[wave0Id].line, pixiApp);
    }
    pixiApp.stage.addChild(waves[wave0Id].line);
    
    // draw the other waves
    for (let wave of wavesArray) {
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

let inputEvent = new Event("input");
function resize(renderer) {
    renderer.resize(document.body.clientWidth, getWaveDisplayHeight());
    for (let input of Object.values(watcher.inputs)) {
        input.dispatchEvent(inputEvent);
    }
}

window.waves = {
    [wave0Id]: {
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
};

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
document.getElementById("togglewaves").addEventListener("click", toggleWaveVisibility);

window.addEventListener("resize", resize.bind(null, pixiApp.renderer));

display.appendChild(pixiApp.view);

pixiApp.ticker.add((delta) => draw(delta, pixiApp));

// ----- automation stuff

let animate = true;

// https://stackoverflow.com/a/15106541
function getRandomProperty(obj) {
    let keys = Object.keys(obj);
    return obj[keys[ keys.length * Math.random() << 0]];
};

let getRand = (min, max, step = 1) => Math.ceil((Math.random() * (max - min) + min) / step) * step;
let getFloat = (value, _default = 0) => isNaN(parseFloat(value)) ? _default : parseFloat(value);
let interpolateStepCount = (start, end, step) => Math.abs((start - end) / step);

let lastInputChangeTime = new Date();
const CHANGE_INPUT_TIME_MS = 100;
let tweeningInputs = new Set();
function loop() {
    if (!animate) return;
    
    if (new Date() - lastInputChangeTime <= CHANGE_INPUT_TIME_MS) return;

    let selectedInput = getRandomProperty(watcher.inputs);
    if (selectedInput === undefined || tweeningInputs.has(selectedInput.id)) return;
    tweeningInputs.add(selectedInput.id);
    
    // if the container was removed from the DOM
    if (!animate || selectedInput === undefined || !document.getElementById(selectedInput.id)) {
        tweeningInputs.delete(selectedInput.id);
        return;
    }
    
    let min = getFloat(selectedInput.min);
    let max = getFloat(selectedInput.max);
    let step = getFloat(selectedInput.step);
    
    let current = getFloat(selectedInput.value);
    let next = getRand(min, max, step);
    let direction = next >= current ? 1 : -1;
    
    let stepsToTake = Math.round(interpolateStepCount(current, next, step));
    
    const MIN_STEPS = 150;
    const MAX_STEPS = 400;
    if (stepsToTake < MIN_STEPS) {
        stepsToTake = MIN_STEPS;
        step = interpolateStepCount(current, next, MIN_STEPS);
    }
    else if (stepsToTake > MAX_STEPS) {
        stepsToTake = MAX_STEPS;
        step = interpolateStepCount(current, next, MAX_STEPS);
    }
    let stepsTaken = 0;
    let lastStepTakenTime = new Date();
    const TAKE_NEXT_STEP_TIME_MS = 15;

    (function stepFunc() {
        if (!animate || selectedInput === undefined || !document.getElementById(selectedInput.id) || stepsTaken === stepsToTake) {
            tweeningInputs.delete(selectedInput.id);
            return;
        }
        
        if (new Date() - lastStepTakenTime <= TAKE_NEXT_STEP_TIME_MS) {
            requestAnimationFrame(stepFunc);
            return;
        }
        
        try {
            current = current + (step * direction);
            selectedInput.value = current;
            selectedInput.dispatchEvent(new Event('input'));
            stepsTaken++;

            requestAnimationFrame(stepFunc);
        }
        catch (e) {
            console.error(e);
        }
        finally {
            lastStepTakenTime = new Date();
        }
    })();
}

let lastStepTime = new Date();
const LOOP_WAIT_TIME_MS = 100;
function stepFunc() {
    if (!animate) return;
    
    requestAnimationFrame(stepFunc);
    
    if (new Date() - lastStepTime <= LOOP_WAIT_TIME_MS) return;

    try {
        loop();
    }
    // catching errors will stop the step func from executing
    // rapidly because the lastStepTime is not updated until the end
    catch (e) {
        console.error(e);
    }
    finally {
        lastStepTime = new Date();
    }
}

function toggleAnimation(e) {
    animate = !animate;
    e.target.innerText = animate ? e.target.dataset['stopText'] :e. target.dataset['startText'];
    if (animate) {
        stepFunc();
    }
}

document.getElementById("toggleanimation").addEventListener("click", toggleAnimation);

stepFunc();

// this code needs some serious reorganization