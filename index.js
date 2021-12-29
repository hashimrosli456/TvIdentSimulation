var canvas;
var gl;
var points = [];
var colors = [];
var baseColors = [
	vec4(0.0, 0.0, 0.0, 0.0),
	vec4(1.0, 0.0, 0.0, 1.0),
	vec4(0.0, 1.0, 0.0, 1.0),
	vec4(0.0, 0.0, 1.0, 1.0),
];

window.onload = function init() {
	// WebGL functions
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);

	if (!gl) alert("WebGL 2.0 isn't available");
	
	//canvas on the animation section and the color of the canvas
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	const program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

	// shader controls
	const controls = {};
	controls.vColor = gl.getAttribLocation(program, "vColor");
	controls.vPosition = gl.getAttribLocation(program, "vPosition");
	controls.thetaLoc = gl.getUniformLocation(program, "theta");
	controls.scaleLoc = gl.getUniformLocation(program, "scale");
	controls.transLoc = gl.getUniformLocation(program, "translate");

	// 3D gasket properties
	const gasket = {
		vertices: [
		vec3(0.0, 0.0, -0.25),
		vec3(0.0, 0.2357, 0.0833),
		vec3(-0.2041, -0.1179, 0.0833),
		vec3(0.2041, -0.1179, 0.0833),
		],
		division: 1,
		speeds: 100,
		theta: [0, 0, 0],
		degree: 180,
		rotateX: [false, true, false],
		scale: 0.5,
		scaleFac: 2,
		translate: [0.0, 0.0],
		pause: true,
	};

	// animation list for 3D gasket
	// The animation will enlarge first then rotate to left and right 
	// which use the x-axis and the loop by random hit and bounce in loop.
	const animsRegistry = obj => [
		// enlarge and shrink
		scaling.bind(null, obj, obj.scaleFac),
		scaling.bind(null, obj, obj.scale),
		rotation.bind(null, obj, 0, 0),
		// rotation X
		rotation.bind(null, obj, -obj.degree, 0),
		rotation.bind(null, obj, obj.degree, 0),
		// rotation Y
		rotation.bind(null, obj, -obj.degree, 1),
		rotation.bind(null, obj, obj.degree, 1),
		rotation.bind(null, obj, 0, 1),
		// random hit and bounce
		setDelta.bind(null, obj),
		translation.bind(null, obj),
	];
  
	// input settings for 3D gasket
	// This input setting will take the input from the slider and 
	// render the animation everytime the input is changed
	const settings = Array.from(document.querySelectorAll(".settings"));
	settings.forEach(setting => {
		setting.addEventListener("change", () => {
			gasket[setting.name] = Number(setting.value);
			let textbox = document.querySelector(`[class="textbox"][name="${setting.name}"]`);

			if (textbox !== null) {
				textbox.value = setting.value;
			}

			render(controls, gasket);
			gasket.animations = animsRegistry(gasket);
			gasket.currentAnim = gasket.animations.shift();
		});
	});
	
	// The color picker is based on the color 1 to color 4 
	// the changes will change the tetrahedron color whe user pick color.
	const colorPickers = Array.from(document.querySelectorAll(".colorpicker"));
	colorPickers.forEach((cP, i) => {
		cP.addEventListener("change", () => {
			baseColors[i] = hex2rgb(cP.value);
			render(controls, gasket);
		});
	});
	
	// The start and stop control button
	const startBtn = document.getElementById("start-button");
	startBtn.addEventListener("click", () => {
		if (!gasket.pause) {
			gasket.pause = true;
			startBtn.value = "Start";
			startBtn.style.background = "#117A65";
		} 
		else {
			gasket.pause = false;
			animate(gasket, controls);
			inputs.forEach(i => {i.disabled = true;});
			startBtn.value = "Stop";
			startBtn.style.background = "#B03A2E";
		}
	});

	// the restart control button
	restartBtn = document.getElementById("restart-button"); // global var
	restartBtn.disabled = true;
	restartBtn.addEventListener("click", () => {
		gasket.pause = true;
		gasket.theta = [0, 0, 0];
		gasket.translate = [0.0, 0.0];
		render(controls, gasket);
		gasket.animations = animsRegistry(gasket);
		gasket.currentAnim = gasket.animations.shift();
		inputs.forEach(i => {
			i.disabled = false;
		});
		restartBtn.disabled = true;
		startBtn.value = "Start";
		startBtn.style.background = "#117A65";
	});

	// initial display of static 3D gasket
	render(controls, gasket);
	// obtain animation list and start 3D gasket animation
	gasket.animations = animsRegistry(gasket);
	gasket.currentAnim = gasket.animations.shift();
};

function triangle(a, b, c, color) {
	colors.push(baseColors[color]);
	points.push(a);
	colors.push(baseColors[color]);
	points.push(b);
	colors.push(baseColors[color]);
	points.push(c);
}

function tetra(a, b, c, d) {
	triangle(a, c, b, 0);
	triangle(a, c, d, 1);
	triangle(a, b, d, 2);
	triangle(b, c, d, 3);
}

function divideTetra(a, b, c, d, count) {
	if (count === 0) {
		tetra(a, b, c, d);
	} 
	else {
		let ab = mix(a, b, 0.5);
		let ac = mix(a, c, 0.5);
		let ad = mix(a, d, 0.5);
		let bc = mix(b, c, 0.5);
		let bd = mix(b, d, 0.5);
		let cd = mix(c, d, 0.5);

		--count;
		divideTetra(a, ab, ac, ad, count);
		divideTetra(ab, b, bc, bd, count);
		divideTetra(ac, bc, c, cd, count);
		divideTetra(ad, bd, cd, d, count);
	}
}

function animate(obj, controls) {
	if (obj.pause === true) {
		return;
	}
	// enable restart button if it is the last animation (translation)
	if (obj.animations.length === 1) {
		restartBtn.disabled = false;
	}
	// current animation completes, switch animation
	if (obj.currentAnim()) {
		obj.currentAnim = obj.animations.shift(); // get first animation from list
	} 
	else {
		// current animation has not completed, proceeds with same animation
		gl.uniform3fv(controls.thetaLoc, flatten(obj.theta));
		gl.uniform1f(controls.scaleLoc, obj.scale);
		gl.uniform2fv(controls.transLoc, obj.translate);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLES, 0, points.length);
	}
	requestAnimationFrame(() => animate(obj, controls));
}

function rotation(obj, degree, axis) {
	// if rotationX/Y/Z is enabled
	if (obj.rotateX[axis] === true) {
		let difference = degree - obj.theta[axis];
		if (Math.abs(difference) > obj.speeds * 0.01) {
			// add/subtract based on sign
			obj.theta[axis] += Math.sign(difference) * obj.speeds * 0.01;
			return false;
		} 
		else {
			obj.theta[axis] = degree;
			return true;
		}
	} 
	else {
		return true;
	}
}

function scaling(obj, scaleFac) {
	let difference = scaleFac - obj.scale;
	if (Math.abs(difference) > obj.speeds * 0.0005) {
		// add/subtract based on sign
		obj.scale += Math.sign(difference) * obj.speeds * 0.0005;
		return false;
	} 
	else {
		obj.scale = scaleFac;
		return true;
	}
}

function translation(obj) {
	// reverse x when any vertex hits left/right
	if (obj.vertices.some(v => Math.abs(v[0] + obj.translate[0] / obj.scale) > 0.9 / obj.scale)) {
		obj.deltaX = -obj.deltaX;
	}
	// reverse y when any vertex hits top/bottom
	if (obj.vertices.some(v => Math.abs(v[1] + obj.translate[1] / obj.scale) > 0.9 / obj.scale)){		
		obj.deltaY = -obj.deltaY;
	}
	obj.translate[0] += obj.deltaX;
	obj.translate[1] += obj.deltaY;
	return false;
}

// convert colour picker hex code to vec4
function hex2rgb(hex) {
	let bigint = parseInt(hex.substring(1), 16);
	let R = ((bigint >> 16) & 255) / 255;
	let G = ((bigint >> 8) & 255) / 255;
	let B = (bigint & 255) / 255;
	return vec4(R, G, B, 1.0);
}

// adjust delta (displacement) based on object's speeds
function setDelta(obj) {
	obj.deltaX = obj.speeds * Math.cos(Math.PI / 3) * 0.00004;
	obj.deltaY = obj.speeds * Math.sin(Math.PI / 3) * 0.00004;
	return true;
}

// 3D gasket render functions
function render(controls, obj) {
	points = [];
	colors = [];
	divideTetra(
		obj.vertices[0],
		obj.vertices[1],
		obj.vertices[2],
		obj.vertices[3],
		obj.division
	);

	let cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
	gl.vertexAttribPointer(controls.vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(controls.vColor);

	let vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
	gl.vertexAttribPointer(controls.vPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(controls.vPosition);

	gl.uniform3fv(controls.thetaLoc, flatten(obj.theta));
	gl.uniform1f(controls.scaleLoc, obj.scale);
	gl.uniform2fv(controls.transLoc, obj.translate);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, points.length);
}