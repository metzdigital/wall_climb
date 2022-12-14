var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var pix_width = canvas.width;
var pix_height = canvas.height;
var pix_width_center = canvas.width/2;
var pix_height_center = canvas.height - canvas.height/6;
var mouseX=pix_width_center;
var mouseY=pix_height_center;


var meters2pix = 1000;

//Increasing time variable used for cos/sin animation stuff
var time = 0;

//Our main objects in the scene
var wall_left;
var wall_right;
var veh;

//time step to use when integrating etc
var dt = 0.001;

//velocity increase rate (used for controls)
var wheel_vel_rate = 5; //rate at which the speed increases
var wheel_vel_decay = 0.1; //rate at which the speed slows down

//control input flags
var ctrl_left_wheel_up = false;
var ctrl_left_wheel_down = false;
var ctrl_right_wheel_up = false;
var ctrl_right_wheel_down = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deg2rad(deg){
	return Math.PI/180*deg;
}

//Convert values to color
function rgb(r, g, b){
  r = Math.floor(r);
  g = Math.floor(g);
  b = Math.floor(b);
  return ["rgb(",r,",",g,",",b,")"].join("");
}

//Create a vector that points from point1 to point2
function pts2vec(pt1, pt2){
	var vec = new Victor((pt2.x-pt1.x),(pt2.y-pt1.y));
	return vec;
}

function drawCoordinate() {
	ctx.strokeStyle=rgb(100,100,200);
	ctx.beginPath();
	ctx.moveTo(0,pix_height_center);
	ctx.lineTo(pix_width,pix_height_center);
	ctx.stroke();
	ctx.moveTo(pix_width_center,0);
	ctx.lineTo(pix_width_center,pix_height);
	ctx.stroke();
}

function m2pix(meters) {
	return meters * meters2pix;
}

function clear() {
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

function dist(x,y){
	return Math.sqrt(Math.pow(x,2)+Math.pow(y,2));
}

//Draw the scene
function draw(){
	clear();
	drawCoordinate();
	time += 0.001;
	veh.update();
	veh.draw();
	wall_left.draw();
	wall_right.draw();

	raf = window.requestAnimationFrame(draw);
	 // sleep(10);
}

class Vechile{
	//x - pos in meters
	//y - pos in meters
	//rot - rotation of vehicle
	//wheel_r - radius of screws in meters
	//body_w - width of body in meters
	//body_h - height of body in meters
	//mass - mass of vehicle in kg
	//k - spring constant
	//preload - initial preload at start
	constructor(x, y, rot, wheel_radius, body_w, body_h, mass, k, preload){
		this.x = x;
		this.y = y;
		this.rot = rot;
		this.wheel_radius = wheel_radius;
		this.body_w = body_w;
		this.body_w0 = body_w;
		this.body_h = body_h;
		this.mass = mass;
		this.k = k;
		this.preload = preload;

		//Internal stuff
		this.x0 = body_w + preload*k;

		this.wheel_L_x0 = this.x - this.body_w/2*Math.cos(-this.rot);
		this.wheel_L_x = this.x - this.body_w/2*Math.cos(-this.rot);
		this.wheel_L_y0 = this.y - this.body_w/2*Math.sin(-this.rot);
		this.wheel_L_y = this.y - this.body_w/2*Math.sin(-this.rot);
		this.wheel_L_rot = 0;
		this.wheel_L_qd = 0; //rotation rate of the left wheel
		this.wheel_L_qdd = 0; //acceleration rate of the left wheel
		this.wheel_L_torque = 0; //torque being applied to the left wheel
		this.wheel_L_wall_tangent = 0;

		this.wheel_R_x0 = this.x + this.body_w/2*Math.cos(-this.rot);
		this.wheel_R_y0 = this.y + this.body_w/2*Math.sin(-this.rot);
		this.wheel_R_x = this.x + this.body_w/2*Math.cos(-this.rot);
		this.wheel_R_y = this.y + this.body_w/2*Math.sin(-this.rot);
		this.wheel_R_rot = 0;
		this.wheel_R_qd = 0; //rotation rate of the right wheel
		this.wheel_R_qdd = 0; //acceleration rate of the right wheel
		this.wheel_R_torque = 0; //torque being applied to the right wheel
		this.wheel_R_wall_tangent = 0;
		

		this.spring_gap = this.body_w/8;
		this.spring_coils = 7;
	}

	draw(){
		this.draw_wheels();
		this.draw_body();
		this.draw_spring();
	}

	draw_wheels(){
		//Draw the left wheel
		ctx.save();
			//Move to the vehicle center		
			ctx.translate(m2pix(this.x)+pix_width_center, pix_height_center-m2pix(this.y));
			//Rotate by vehicle amount
			ctx.rotate(this.rot);
			//Translate to left wheel
			ctx.translate(m2pix(-this.body_w/2), 0);
			//Rotate by wheel angle
			ctx.rotate(this.wheel_L_rot);
			//Draw the arc
			ctx.strokeStyle = rgb(0, 30, 100);
			ctx.fillStyle = rgb(64,64,64);
			ctx.beginPath();
			ctx.arc(0, 0, m2pix(this.wheel_radius), 0, 2*Math.PI);
			ctx.fill();
			ctx.stroke();
			//Change the color and now draw the X lines
			ctx.strokeStyle = rgb(128, 0, 0);
			ctx.beginPath();
			ctx.moveTo(-1*m2pix(this.wheel_radius), 0);
			ctx.lineTo(m2pix(this.wheel_radius), 0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, -1*m2pix(this.wheel_radius));
			ctx.lineTo(0, m2pix(this.wheel_radius));
			ctx.stroke();
		ctx.restore();

		//Draw the right wheel
		ctx.save();
			//Move to the vehicle center		
			ctx.translate(m2pix(this.x)+pix_width_center, pix_height_center-m2pix(this.y));
			//Rotate by vehicle amount
			ctx.rotate(this.rot);
			//Translate to right wheel
			ctx.translate(m2pix(this.body_w/2), 0);
			//Rotate by wheel angle
			ctx.rotate(this.wheel_R_rot);
			//Draw the arc
			ctx.strokeStyle = rgb(0, 30, 100);
			ctx.fillStyle = rgb(64,64,64);
			ctx.beginPath();
			ctx.arc(0, 0, m2pix(this.wheel_radius), 0, 2*Math.PI);
			ctx.fill();
			ctx.stroke();
			//Change the color and now draw the X lines
			ctx.strokeStyle = rgb(128, 0, 0);
			ctx.beginPath();
			ctx.moveTo(-1*m2pix(this.wheel_radius), 0);
			ctx.lineTo(m2pix(this.wheel_radius), 0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, -1*m2pix(this.wheel_radius));
			ctx.lineTo(0, m2pix(this.wheel_radius));
			ctx.stroke();
		ctx.restore();
	}

	draw_body(){
		ctx.save();
			//Move to the vehicle center		
			ctx.translate(m2pix(this.x)+pix_width_center, pix_height_center-m2pix(this.y));
			//Rotate by vehicle amount
			ctx.rotate(this.rot);
			//Start drawing the left body
			ctx.strokeStyle = rgb(0, 0, 0);
			ctx.fillStyle = rgb(64,64,64);
			
			ctx.beginPath();
			ctx.rect(m2pix(-this.body_w/2), m2pix(-this.body_h/2), m2pix(this.body_w/2-this.spring_gap), m2pix(this.body_h));
			ctx.fill();
			ctx.stroke();

			//Drawing the right body
			ctx.beginPath();
			ctx.rect(m2pix(this.spring_gap), m2pix(-this.body_h/2), m2pix(this.body_w/2-this.spring_gap), m2pix(this.body_h));
			ctx.fill();
			ctx.stroke();

			//Draw shaft for spring
			ctx.beginPath();
			ctx.rect(m2pix(-this.spring_gap), m2pix(-this.body_h/4), m2pix(this.spring_gap*2), m2pix(this.body_h/2));
			ctx.fill();
			ctx.stroke();


		ctx.restore();
	}

	draw_spring(){
		var init_line_width = ctx.lineWidth;
		ctx.save();
			//Move to the vehicle center		
			ctx.translate(m2pix(this.x)+pix_width_center, pix_height_center-m2pix(this.y));
			//Rotate by vehicle amount
			ctx.rotate(this.rot);
			//Start drawing the left body
			ctx.strokeStyle = rgb(0, 192, 0);
			ctx.fillStyle = rgb(64,64,64);
			ctx.lineWidth = 4;
			
			ctx.beginPath();
			ctx.moveTo(m2pix(-this.spring_gap), m2pix(-this.body_h/3));
			ctx.lineTo(m2pix(-this.spring_gap), m2pix(this.body_h/3));
			var coil_pitch = this.spring_gap*2/this.spring_coils;
			
			for(var i=0; i<=this.spring_coils;i++){
				if(i%2){
					ctx.lineTo(m2pix(-this.spring_gap+i*coil_pitch), -m2pix(this.body_h/3));
				}
				else{
					ctx.lineTo(m2pix(-this.spring_gap+i*coil_pitch), m2pix(this.body_h/3));
				}	
			}
			ctx.lineTo(m2pix(this.spring_gap), m2pix(this.body_h/3));

			ctx.stroke();
		ctx.restore();
		ctx.lineWidth = init_line_width;
	}

	calc_left_wheel(){
		if(ctrl_left_wheel_up){
			this.wheel_L_qd -= wheel_vel_rate;
			ctrl_left_wheel_up = false;
		}
		else if(ctrl_left_wheel_down){
			this.wheel_L_qd += wheel_vel_rate;
			ctrl_left_wheel_down = false;
		}
		else{
			if(this.wheel_L_qd > 0){
				this.wheel_L_qd -= wheel_vel_decay;
			}
			else if(this.wheel_L_qd < 0) {
				this.wheel_L_qd += wheel_vel_decay;
			}
		}

		this.wheel_L_rot += this.wheel_L_qd*dt;

		//A change in wheel angle will move the rotation point parallel to the line of contact
		this.wheel_L_x = this.wheel_L_x0 + this.wheel_L_rot*this.wheel_radius*Math.cos(wall_left.slope);
		this.wheel_L_y = this.wheel_L_y0 + this.wheel_L_rot*this.wheel_radius*Math.sin(wall_left.slope);

	}

	calc_right_wheel(){
		if(ctrl_right_wheel_up){
			this.wheel_R_qd += wheel_vel_rate;
			ctrl_right_wheel_up = false;
		}
		else if(ctrl_right_wheel_down){
			this.wheel_R_qd -= wheel_vel_rate;
			ctrl_right_wheel_down = false;
		}
		else{
			if(this.wheel_R_qd > 0){
				this.wheel_R_qd -= wheel_vel_decay;
			}
			else if(this.wheel_R_qd < 0) {
				this.wheel_R_qd += wheel_vel_decay;
			}
		}

		this.wheel_R_rot += this.wheel_R_qd*dt;

		//A change in wheel angle will move the rotation point parallel to the line of contact
		this.wheel_R_x = this.wheel_R_x0 + this.wheel_R_rot*this.wheel_radius*Math.cos(wall_right.slope);
		this.wheel_R_y = this.wheel_R_y0 + this.wheel_R_rot*this.wheel_radius*Math.sin(wall_right.slope);
	}

	update(){

		//Calc if the wheels have moved
		this.calc_left_wheel();	
		this.calc_right_wheel();

		//adjust the width of the body given the new position of the wheels
		this.body_w = dist(this.wheel_L_x-this.wheel_R_x, this.wheel_L_y-this.wheel_R_y);

		//adjust the angle given the new position of the wheels
		this.rot = -Math.atan2(this.wheel_L_y-this.wheel_R_y, this.wheel_L_x-this.wheel_R_x);

		//The center of the vehicle is located between the two wheel points
		this.x = (this.wheel_L_x+this.wheel_R_x)/2;
		this.y = (this.wheel_L_y+this.wheel_R_y)/2;
		
		this.spring_gap = this.body_w0/8 + (this.body_w - this.body_w0);

	}

	



}

class Wall{
	//x - offset in x-axis in meters
	//slope - in radians
	//height - how tall is the wall in meters
	constructor(x, slope, height, mirror=false){
		this.x = x;
		this.slope = slope;
		this.height = height;
		this.mirror = mirror;
		
		this.x_intercept = 0;
	}

	draw(){

		ctx.strokeStyle = rgb(153,255,255);
		ctx.fillStyle = rgb(153,255,255);
		if(this.mirror){
			//Draw the right wall
			ctx.beginPath();
			ctx.moveTo(m2pix(this.x_intercept)+pix_width_center, pix_height_center);
			ctx.lineTo(m2pix(this.height)*Math.cos(this.slope)+m2pix(this.x_intercept)+pix_width_center,pix_height_center-m2pix(this.height)*Math.sin(this.slope));
			ctx.lineTo(pix_width, pix_height_center-m2pix(this.height)*Math.sin(this.slope));
			ctx.lineTo(pix_width, pix_height_center);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
		else
		{	
			//Draw the left wall
			ctx.beginPath();
			ctx.moveTo(m2pix(this.x_intercept)+pix_width_center, pix_height_center);
			ctx.lineTo(m2pix(this.height)*Math.cos(this.slope)+m2pix(this.x_intercept)+pix_width_center,pix_height_center-m2pix(this.height)*Math.sin(this.slope));
			ctx.lineTo(0, pix_height_center-m2pix(this.height)*Math.sin(this.slope));
			ctx.lineTo(0, pix_height_center);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	}
	
}

function init_system(){
	//Given vehicles position and rotation what are the x,y position of contact for each wall
	// and what is the x intercept for the wall given that info
	
	wall_left = new Wall(-.4, deg2rad(100), 2);
	wall_right = new Wall(0.4, deg2rad(85), 2, true);

	//Optimal vehicle angle is the average of the two
	var vehicle_rot = (wall_left.slope+wall_right.slope)/2;
	veh = new Vechile(0, 0.3, Math.PI/2-vehicle_rot, 0.05, 0.4, 0.09, 50, 200, 1000);

	veh.wheel_L_wall_tangent = wall_left.slope - Math.PI/2;
	veh.wheel_R_wall_tangent = wall_right.slope - Math.PI/2;

	//Find location in X,Y where wheel touches wall given wall angle (slope) use that to find x-intercept
	wall_wheel_L_x = veh.wheel_L_x0 - veh.wheel_radius*Math.cos(veh.wheel_L_wall_tangent);
	wall_wheel_L_y = veh.wheel_L_y0 - veh.wheel_radius*Math.sin(veh.wheel_L_wall_tangent);
	wall_left.x_intercept = wall_wheel_L_x - wall_wheel_L_y/Math.tan(wall_left.slope);

	wall_wheel_R_x = veh.wheel_R_x0 + veh.wheel_radius*Math.cos(veh.wheel_R_wall_tangent);
	wall_wheel_R_y = veh.wheel_R_y0 + veh.wheel_radius*Math.sin(veh.wheel_R_wall_tangent);
	wall_right.x_intercept = wall_wheel_R_x - wall_wheel_R_y/Math.tan(wall_right.slope);

}


window.addEventListener('keydown', function(e) {
	if (e.defaultPrevented) {
	return; // Do nothing if the event was already processed
	}

	console.log(e.key);
	switch (e.key) {
		case "a":
			ctrl_left_wheel_up = true;
		break;
		case "z":
			ctrl_left_wheel_down = true;
		break;
		case "k":
			ctrl_right_wheel_up = true;
		break;
		case "m":
			ctrl_right_wheel_down = true;
		break;
		case "s":
			meters2pix = 10;
			pix_width_center = pix_width/2;
			pix_height_center = pix_height/2;
		break;
	}



	// Cancel the default action to avoid it being handled twice
	//e.preventDefault();
}, true);

canvas.addEventListener('mousemove', function(e) {
	mouseX = e.clientX;
	mouseY = e.clientY;
});

canvas.addEventListener('mouseout', function(e) {
  //window.cancelAnimationFrame(raf);
  //running = false;
});

//var ray = new Ray(-10, 10, -Math.PI/2, 1, 'white', rays);

function addOptic() {
    var type, x, y, wr, h, q, index, ref, abs;
    var text;
    type = document.getElementById("type").value;
    x = parseFloat(document.getElementById("x_pos").value);
    y = parseFloat(document.getElementById("y_pos").value);
    wr = parseFloat(document.getElementById("wide_rad").value);
    h = parseFloat(document.getElementById("height").value);
    q = parseFloat(document.getElementById("rotation").value)*Math.PI/180;
    index = parseFloat(document.getElementById("index").value);
    ref = parseFloat(document.getElementById("reflection").value);
    abs = parseFloat(document.getElementById("absorption").value);

    switch(type) {
        case "sphere":
            var rect1 = new OpticSphere(x, y, wr, h, q, index, ref, abs);
            text = "Added Sphere Optic"
        break;
        case "rect":
            var rect1 = new OpticRect(x, y, wr, h, q, index, ref, abs);
            text = "Added Rect Optic"

        break;
        case "flat":
            var fold1 = new OpticFlat(x, y, h, q, index, ref, abs);
            text = "Added Fold Optic"
        break;
        default:
            text = "No case found"
    }
	UpdateOpticList();
    document.getElementById("output").innerHTML = text;
}

function removeOptic(){
	var optIndex = parseInt(document.getElementById("opticSelect").selectedIndex);
	if (optIndex > -1) {
		optic.splice(optIndex, 1);
	}
	UpdateOpticList(); 	
}

function reset() {
    optic = [];
    text = "Optical elements cleared"
    document.getElementById("output").innerHTML = text;
	UpdateOpticList(); 	
}

function UpdateOpticList(){
	var x; 
    var option;
	
	document.getElementById("opticSelect").innerHTML="";
	
	for(var i=0; i<optic.length; i=i+1){
		x = document.getElementById("opticSelect");
		option = document.createElement("option");
	    option.text = optic[i].type + "; X:" + String(optic[i].x) + "; Y:" + String(optic[i].y)
		x.add(option);	
	}
}

function selectOptic() {
	
	var optIndex = parseInt(document.getElementById("opticSelect").selectedIndex);
    //document.getElementById("output").innerHTML = "Select Changed to " + String(optIndex);
	
    document.getElementById("x_pos").value = String(optic[optIndex].x);
	document.getElementById("y_pos").value = String(optic[optIndex].y);
	
	document.getElementById("height").value = String(optic[optIndex].height)
	document.getElementById("rotation").value = String(optic[optIndex].rot*180/Math.PI);
	document.getElementById("index").value = String(optic[optIndex].index)
	document.getElementById("reflection").value = String(optic[optIndex].reflect)
	document.getElementById("absorption").value = String(optic[optIndex].absorb)
	
	switch(optic[optIndex].type) {
		case "Sphere":
			document.getElementById("type").selectedIndex = "0"
			document.getElementById("wide_rad").value = String(optic[optIndex].radius);
			break;
		case "Rect":
			document.getElementById("type").selectedIndex = "1"
			document.getElementById("wide_rad").value = String(optic[optIndex].width);
			break;
		case "Fold":
			document.getElementById("type").selectedIndex = "2"
			document.getElementById("wide_rad").value = "0.0"
			break;
	}
}

function updateOptic(){
	var x, y, wr, h, q, index, ref, abs;
	var optIndex = parseInt(document.getElementById("opticSelect").selectedIndex);
	
	x = parseFloat(document.getElementById("x_pos").value);
    y = parseFloat(document.getElementById("y_pos").value);
    wr = parseFloat(document.getElementById("wide_rad").value);
    h = parseFloat(document.getElementById("height").value);
    q = parseFloat(document.getElementById("rotation").value)*Math.PI/180;
    index = parseFloat(document.getElementById("index").value);
    ref = parseFloat(document.getElementById("reflection").value);
    abs = parseFloat(document.getElementById("absorption").value);

	switch(optic[optIndex].type) {
		case "Sphere":
			optic[optIndex].x = x;
			optic[optIndex].y = y;
			optic[optIndex].radius = wr;
			optic[optIndex].height = h;
			optic[optIndex].rot = q;
			optic[optIndex].index = index;
			optic[optIndex].reflect = ref;
			optic[optIndex].absorb = abs;
			optic[optIndex].updatePts();
			break;
		case "Rect":
			optic[optIndex].x = x;
			optic[optIndex].y = y;
			optic[optIndex].width = wr;
			optic[optIndex].height = h;
			optic[optIndex].rot = q;
			optic[optIndex].index = index;
			optic[optIndex].reflect = ref;
			optic[optIndex].absorb = abs;
			optic[optIndex].updatePts();
			break;
		case "Fold":
			optic[optIndex].x = x;
			optic[optIndex].y = y;
			optic[optIndex].height = h;
			optic[optIndex].rot = q;
			optic[optIndex].index = index;
			optic[optIndex].reflect = ref;
			optic[optIndex].absorb = abs;
			optic[optIndex].updatePts();
			break;
	}
	UpdateOpticList();

}

init_system();
draw();
console.log(veh);