var margin = {top: 200, right: 30, bottom: 30, left: 300};
var cursor;
var curve;
var skelCurve;
var allCurves;
var isDragging = false;
var draggingInfo;
var svg;
var paths;
var ptCircles;
var lineFunction;
var fineLine;
var oldPt;
var showPoints = false;
var adjustWidth = 1;
var savedsvg;

function Demo(args){
	lineFunction = d3.svg.line()
		.x(function(d) { return d.point.x; })
		.y(function(d) { return d.point.y; })
		.interpolate("linear");

	this.margin = margin;
    this.width = args.width || 1200;
    this.height = args.height || 1000;
    this.width = this.width - this.margin.left - this.margin.right;
    this.height = this.height - this.margin.top - this.margin.bottom;
    this.init();
}

Demo.prototype.init = function(){

  var $this = this;
	
	var pts;
	pts = [{x:32,y:-2},{x:-113,y:429},{x:322,y:397},{x:203,y:56},{x:692,y:65},{x:524,y:443}]
 
	// the curves we draw to the screen are stored here, one of them is the red skeleton curve, and the other is the actual smooth curve
	this.subd = [
		new SDCurve({
			points: pts,
			resolution: 0
		}),
		new SDCurve({
			points: pts,
			open: true,
			resolution: 5,
			degree: 2,
			type: "bspline"
		})
	];
			
	allCurves = this.subd;
			
	// we can reference them directly via these global variables
	skelCurve = this.subd[0];
	curve = this.subd[1];
	skelCurve.color = "#333333";
	curve.color = "#C00805";
		
	var settings = [
		{name: "Type", value: curve.type(), active: true},
		{name: "Degree", value: curve.degree(), active: true},
		{name: "Resolution", value: curve.resolution(), active: true},
		{name: "Catmull Tension", value: curve.catmullTension(), active: true},
		{name: "Open", value: curve.open(), active: true},
		{name: "Drag Width", value: adjustWidth, active: true},
		{name: "Show Curve Points", value: false, active: true}
	];

	$this.buttons = settings.map(function(button){
			return {setting: button.name, value: button.value, color: button.color, active: button.active};
	});

	d3.select("body").append("div")
		.selectAll(".buttons")
		.data($this.buttons).enter().append("input")
		.attr({
			type: "button",
			value: function(d){return d.setting + ": " + d.value}
		})
		.on("click", function(d){
			$this.clickButton(d,d3.select(this));
		});
	
	d3.select("body").append("div")
		.attr("class","messageDiv")
		.style("color","red")
		.style("font-family","Arial")
		.style("font-size","1.15em")
		.html("<br>");
		
	this.baseSVG = d3.select("body").append("svg").attr("id","mysvg")
		.attr({
			width: $this.width + $this.margin.left + $this.margin.right,
			height: $this.height + $this.margin.top + $this.margin.bottom,
			marginleft: $this.margin.left,
			margintop: $this.margin.top
		})
		.style("cursor", "default")
		.on("mousedown", $this.mousedown)
		.on("mousemove", $this.mousemove)
		.on("mouseup", $this.mouseup);
		
	this.baseSVG.append("rect")
		.attr({
			width: $this.width + $this.margin.left + $this.margin.right,
			height: $this.height + $this.margin.top + $this.margin.bottom
		})
		.style({
			stroke: "black",
			"stroke-width": 1,
			"fill": "none"
		})
	
	d3.select("body").on("keydown", $this.keydown);
	
	this.svg = $this.baseSVG.append("g")
		.attr("transform", "translate(" + $this.margin.left + "," + $this.margin.top + ")")
		
	svg = this.svg;

	cursor = this.svg.append("circle")
		//.attr("r", 6)
		.attr("r", 0)
		.attr("transform", "translate(-100,-100)")
		.attr("class", "cursor")
		.attr("fill","orange")
		
	this.createViz();
};

Demo.prototype.mousedown = function() {
	var pt = d3.mouse(this);
	pt = {x: pt[0], y: pt[1]};
	pt.x -= parseInt(this.attributes.marginleft.value);
	pt.y -= parseInt(this.attributes.margintop.value);
	isDragging = true;
	
	// save where they clicked on the curve so we can drag this point in the mousemove function
	var hitinfo = curve.getClosestPoint(pt);
	draggingInfo = hitinfo;
	oldPt = pt;
}

Demo.prototype.mousemove = function() {
	var pt = d3.mouse(this);
	//var u = pt[0] / this.attributes.width.value;
	//var u = (Math.max(Math.min(pt[0],500),300) - 300) / 200;
	pt = {x: pt[0], y: pt[1]};
	pt.x -= parseInt(this.attributes.marginleft.value);
	pt.y -= parseInt(this.attributes.margintop.value);
		
	if(isDragging) {
		// find how much the mouse has moved
		var delta = sdUtil.minus(pt, oldPt); 
		oldPt = pt;
		
		// move the curve and also update the skeleton curve with how the main curve changed
		var changedPtsMap = curve.moveCurve(draggingInfo, delta, adjustWidth);
		allCurves.forEach(function(d) { if(d!=curve) d.adjustPoints(changedPtsMap); });
		
		paths.attr("d", function(d) { return lineFunction(d.curve()); });
	}

	// adjust orange circle to be new position on curve
	var hitinfo = curve.getClosestPoint(pt);
	var oncurve = hitinfo.pointOnCurve;
	cursor.attr("transform", "translate(" + oncurve.x + "," + oncurve.y + ")");

	updateViz();
}

Demo.prototype.mouseup = function() {
	isDragging = false;
}

Demo.prototype.keydown = function() {
	if(d3.event.keyCode == 80) { // P
		var s = "pts = [";
		curve.points().forEach(function(d) {
			s += "{x:" + Math.round(d.x) + ",y:" + Math.round(d.y) + "},";
		});
		console.log(s.substring(0,s.length-1) + ']');
	}
}

function updatePts(pts) {
	skelCurve.points(pts);
	curve.points(pts);
	updateViz();
}

function adjustPts(ptMap) {
	skelCurve.adjustPoints(ptMap);
	curve.adjustPoints(ptMap);
	updateViz();
}

Demo.prototype.clickButton = function(setting, but){
	if(setting.setting == "Type") {
		var possible = ["bspline","dyn-levin","catmull-rom"];
		var i = possible.indexOf(setting.value);
		if(i >= 0)
			i = (i+1)%possible.length;
		setting.value = possible[i]
		curve.type(possible[i]);
	}
	else if(setting.setting == "Resolution") {
		setting.value = (setting.value + 1)%8;
		curve.resolution(setting.value);
	}
	else if(setting.setting == "Degree") {
		setting.value = Math.max(2,(setting.value + 1)%7);
		curve.degree(setting.value);
	}
	else if(setting.setting == "Catmull Tension") {
		var possible = [0, 0.5, 1];
		var i = possible.indexOf(setting.value);
		if(i >= 0)
			i = (i+1)%possible.length;
		setting.value = possible[i]
		curve.catmullTension(possible[i]);
	}
	else if(setting.setting == "Open") {
		setting.value = !setting.value;
		curve.open(setting.value);
		skelCurve.open(setting.value);
	}
	else if(setting.setting == "Drag Width") {
		setting.value = setting.value % 3 + 1;
		adjustWidth = setting.value;
	}
	else if(setting.setting == "Show Curve Points") {
		setting.value = !setting.value;
		if(setting.value)
			d3.select(".messageDiv").html("Note: Curve points are shown for learning purposes, and can slow down the interactivity.");
		else
			d3.select(".messageDiv").html("<br>");
		showPoints = setting.value;
	}
	
	but.attr({
			value: function(d) {return d.setting + ": " + d.value}
	});
	updateViz();
};

function updateViz(){
  paths.attr("d", function(d) { return lineFunction(d.curve()); });
	
	if(ptCircles != null) ptCircles.remove();
	if(showPoints) {
		ptCircles = this.svg.selectAll(".ptCircles")
			.data(curve.curve())
			.enter()
			.append("circle")
			.attr("r", 3)
			.attr("transform", function(d) { return "translate("+d.point.x + "," + d.point.y +")";})
			.attr("fill","black")
	}
};

Demo.prototype.createViz = function(){
    var $this = this;
	
	paths = this.svg.selectAll(".subdPath")
		.data($this.subd)
		.enter()
		.append("path")
		.attr("d", function(d) { return lineFunction(d.curve()); })
		.attr("stroke", function(d) { return d.color;})
		.attr("stroke-width", function(d) { return d.resolution() == 0 ? 1 : 5;})
		.attr("fill", "none");
					
	if(showPoints) {
		ptCircles = this.svg.selectAll(".ptCircles")
			.data(curve.curve())
			.enter()
			.append("circle")
			.attr("r", 3)
			.attr("transform", function(d) { return "translate("+d.point.x + "," + d.point.y +")";})
			.attr("class","ptCircles")
			.attr("fill","black");
	}
		
	
};