(function() { // https://gist.github.com/paulirish/1579671
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
        window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
            timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        }

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        }
}());

var POWERUP_CHANCE = 7;

var puchanceinput = document.getElementById("puchance");
puchanceinput.value = '7';

function changeChance() {
    var n = puchanceinput.value;
    if (!isNaN(parseFloat(n)) && isFinite(n))
        POWERUP_CHANCE = n;
}




var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var blocks = [];
var mousepos;
var paddle;
var balls = [];
var queueballs = [];
var maxspeed = 10;
var lasttime;
var pause = false;
var currentlevel = 0;
var levels = [];
var powerups = [];
var activepowerups = [];
var bullets = 0;
var lastshot;
var firedbullets = [];

window.onblur = function() {pause = true;}
window.onfocus = function() {
    lasttime = null; // prevent physics bugs on refocus
    pause = false;
}

function setCookie(cookiename, cookievalue) {
    var dt = new Date();
    dt.setFullYear(dt.getFullYear() + 1);
    document.cookie = cookiename + "=" + cookievalue + ";expires=" + dt
}

function animate(time) {
    var timedif;
    if (!lasttime) {
        lasttime = time;
        timedif = 1;
    } else {
        timedif = (time - lasttime) / 20;
        lasttime = time;
        if (timedif > 2) {timedif = 1}; // trying to prevent lag from killing the physics
    }
    requestAnimationFrame(animate);
    drawGame(timedif);
}

function drawGame(time) {
    updatePhysics(time);
    updatePaddle();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i=0;i<blocks.length;i++) {
        blocks[i].creator();
    }
    paddle.creator();
    if (queueballs.length > 0) {
        var qball = queueballs[queueballs.length - 1]
        qball.x = paddle.x + paddle.width / 2;
        qball.y = paddle.y - qball.radius;
        qball.vector = [0, 0];
        qball.creator();
    }
    for (var i=0;i<balls.length;i++) {
        balls[i].creator();
    }
    for (var i=0;i<activepowerups.length;i++) {
        activepowerups[i].creator();
    }
    for (var i=0; i<firedbullets.length;i++) {
        firedbullets[i].creator();
    }
    if (bullets > 0) {
        if (!lastshot) {
            lastshot = new Date().getTime();
            fireBullet();
        } else {
            var now = new Date().getTime()
            if (now - lastshot > 750) {
                lastshot = now;
                fireBullet();
            }
        }
    }
    ctx.font = "80px Arial";
    ctx.fillStyle = "yellow";
    ctx.fillText(queueballs.length + balls.length,25,680);

    if (balls.length + queueballs.length == 0) {loseGame();}
    else if (blocks.length == 0) {winGame();}
}

function winGame() {
    currentlevel += 1;
    if (currentlevel >= levels.length) {currentlevel = 0;alert("You win!");}
    setCookie("breakout", currentlevel);
    clearScreen();
    levels[currentlevel]();
}

function loseGame() {
    clearScreen();
    levels[currentlevel]();
}

function clearScreen() {
    blocks = [];
    balls = [];
    queueballs = [];
    activepowerups = [];
    bullets = 0;
    firedbullets = [];
}

function mouseClick() {
    if (queueballs.length > 0) {
        balls.push(queueballs.pop());
        balls[balls.length - 1].vector = [4, -4];
    }
}

function updatePhysics(time) {
    if (pause) {return;}
    for (var i=0;i<blocks.length;i++) {
        var vector = blocks[i].vector;
        blocks[i].x = blocks[i].x + vector[0];
        blocks[i].y = blocks[i].y + vector[1];
    }
    for (var i=0;i<balls.length;i++) {
        var vector = balls[i].vector;
        balls[i].x = balls[i].x + vector[0] * time;
        balls[i].y = balls[i].y + vector[1] * time;
        checkCollision(balls[i]);

        if (balls[i].y > paddle.y + paddle.height) {
            balls.splice(i, 1);
        }
    }
    for (var i=0;i<activepowerups.length;i++) {
        var vector = activepowerups[i].vector;
        activepowerups[i].x += vector[0] * time;
        activepowerups[i].y += vector[1] * time;
        if (checkPowCatch(activepowerups[i])) {
            activepowerups.splice(i, 1);
        }
    }
    for (var i=0;i<firedbullets.length;i++) {
        var vector = firedbullets[i].vector;
        firedbullets[i].x += vector[0] * time;
        firedbullets[i].y += vector[1] * time;
        if (checkBulletHit(firedbullets[i])) {
            firedbullets.splice(i, 1);
        }
    }
}

function updatePaddle() {
    paddle.x = mousepos? mousepos.x - (paddle.width/2) : paddle.x;
}

function checkCollision(obj) {
    if (obj.x - obj.radius <= 0) {obj.vector = [Math.abs(obj.vector[0]), obj.vector[1]];}; // wall collisions
    if (obj.y - obj.radius <= 0) {obj.vector = [obj.vector[0], Math.abs(obj.vector[1])]}
    if (obj.y + obj.radius >= canvas.height) {obj.vector = [obj.vector[0], -Math.abs(obj.vector[1])]}
    if (obj.x + obj.radius >= canvas.width) {obj.vector = [-Math.abs(obj.vector[0]), obj.vector[1]]}

    if (obj.y > paddle.y - obj.radius && obj.y < paddle.y + paddle.height / 2) { // paddle collision
        if (obj.vector[1] > 0 && obj.x + obj.radius / 2 > paddle.x && obj.x - obj.radius / 2 < paddle.x + paddle.width) {
            var vector = obj.vector;
            var angle = (paddle.x + paddle.width / 2) - obj.x;
            if (Math.abs(angle) < 15) {angle = 0}
            var yvector = vector[1] < maxspeed? -(vector[1] + 0.6) : -vector[1];
            obj.vector = [vector[0] - angle / 10, yvector];
        }
    }

    for (var i=0;i<blocks.length;i++) { // block collision
        if (checkClose(obj, blocks[i])) {
            var quad = checkQuadrant(obj, blocks[i]);
            if (checkHit(obj, blocks[i], quad)) {
                checkPowerup(blocks[i]);
                blocks.splice(i, 1);
                bounce(obj, quad);
                break;
            }
        }
    }
}

function checkPowCatch(obj) {
    if (obj.y > paddle.y - obj.radius && obj.y < paddle.y + paddle.height / 2) { // paddle collision
        if (obj.vector[1] > 0 && obj.x + obj.radius / 2 > paddle.x && obj.x - obj.radius / 2 < paddle.x + paddle.width) {
            obj.power();
            return true;
        }
    }
}

function checkBulletHit(obj) {
    for (var i=0;i<blocks.length;i++) {
        if (obj.x + 4 >= blocks[i].x && obj.x <= blocks[i].x + blocks[i].width && obj.y < blocks[i].y + blocks[i].height) {
            blocks.splice(i, 1);
            return true;
        }
    }
}

function checkHit(obj, block, quadrant) {
    if (quadrant == "top" || quadrant == "bottom") {
        var y = quadrant == "top" ? block.y : block.y + block.height;
        for (var x=block.x;x<block.x + block.width;x++) {
            if (checkDistance(x, y, obj.x, obj.y) <= obj.radius) {
                return true
            }
        }
    } else {
        var x = quadrant == "left" ? block.x : block.x + block.width;
        for (var y=block.y;y<block.y + block.height;y++) {
            if (checkDistance(x, y, obj.x, obj.y) <= obj.radius) {
                return true
            }
        }
    }
    return false;
}

function bounce (obj, quadrant) {
    var vector = obj.vector;
    if (quadrant == "bottom") {
        obj.vector = [vector[0], Math.abs(vector[1])];
    } else if (quadrant == "top") {
        obj.vector = [vector[0], -Math.abs(vector[1])];
    } else if (quadrant == "right") {
        obj.vector = [Math.abs(vector[0]), vector[1]];
    } else {
        obj.vector = [-Math.abs(vector[0]), vector[1]];
    }
}

function checkClose(ball, block) {
    var blockcenter = [block.x + block.width / 2, block.y + block.height / 2];
    var centertoedge = checkDistance(block.x, block.y, blockcenter[0], blockcenter[1]);
    if (checkDistance(ball.x, ball.y, blockcenter[0], blockcenter[1]) < centertoedge + ball.radius) {
        return true
    }
    return false
}

function checkDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function checkQuadrant(ball, block) {
    var top = block.y;
    var bottom = block.y + block.height;
    var left = block.x;
    var right = block.x + block.width;
    if (ball.y > bottom && ball.x < block.x + block.width / 2) { // bottom left side
        var b = left + bottom;
        if (ball.y > -1 * ball.x + b) {return "bottom"}; // check line y > -1*x + b
        return "left";
    }
    else if (ball.y > bottom) { // bottom right side
        var b = bottom - right;
        if (ball.y < ball.x + b) {return "right"}; // check line y > x + b
        return "bottom";
    }
    else if (ball.y < top && ball.x < block.x + block.width / 2) { // top left side
        var b = top - left;
        if (ball.y > ball.x + b) {return "left"}
        return "top";
    }
    else if (ball.y < top) { // top right side
        var b = top + right;
        if (ball.y < -1 * ball.x + b) {return "top"}
        return "right"
    }
    else if (ball.x > right) { // right side
        return "right"
    }
    else if (ball.x < left) { // left side
        return "left"
    }
}

function checkPowerup(block) {
    if (Math.random() * 100 < POWERUP_CHANCE) {
        var pow = Math.round(Math.random() * (powerups.length - 1));
        powerups[pow](block.x + block.width / 2, block.y + block.height / 2);
    }
}

function getPosition(e, istouch) {

    var xoffset = 0;
    var yoffset = 0;
    if (!e)
        e = window.event;

    var main = document.getElementById("main");
    var game = document.getElementById("game");
    xoffset += canvas.offsetLeft;
    yoffset += canvas.offsetTop;

    if (istouch) {
        e = e.changedTouches[0];
    }

    var x = e.pageX - xoffset;
    var y = e.pageY - yoffset;

    return {"x": x, "y": y}
}
canvas.onmousemove = function(event) {
    mousepos = getPosition(event);
}
canvas.ontouchmove = function (event) {
    mousepos = getPosition(event, true);
}
canvas.onclick = function () {
    mouseClick();
}

function rect(x, y, w, h, vector, creator, ispaddle) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.vector = vector;
    this.creator = function() {creator(this.x, this.y, this.width, this.height)}
    if (!ispaddle) {blocks.push(this);}
}

function circle(x, y, r, vector, creator, noque) {
    this.x = x;
    this.y = y;
    this.radius = r;
    this.vector = vector;
    this.creator = function() {creator(this.x, this.y, this.radius)}
    if (!noque) {queueballs.push(this);}
}

var redRect = function(x, y, w, h) {
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, w, h);
}

var blueRect = function(x, y, w, h) {
    ctx.fillStyle = "blue";
    ctx.fillRect(x, y, w, h);
}

var yellowBall = function(x, y, r) {
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill()
}

function powerup(x, y, radius, vector, creator, power) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vector = vector;
    this.creator = function() {creator(this.x, this.y)};
    this.power = power;
    activepowerups.push(this);
}

var splitballpower = function () {
    if (balls.length == 0) {
        balls.push(new circle(paddle.x + paddle.width / 2, paddle.y - 20, 20, [4, -4], yellowBall, true));
        return;
    }
    var lastball = balls[balls.length - 1];
    balls.push(new circle(lastball.x, lastball.y, 20, [4, -4], yellowBall, true));
    balls.push(new circle(lastball.x, lastball.y, 20, [4, 4], yellowBall, true));
    balls.push(new circle(lastball.x, lastball.y, 20, [-4, -4], yellowBall, true));
    balls.push(new circle(lastball.x, lastball.y, 20, [-4, 4], yellowBall, true));
}
var splitball = function(x, y) {
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(x,y,7,0,2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x-6,y-10,7,0,2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x+6,y-10,7,0,2*Math.PI);
    ctx.fill();
}
powerups.push(function(x, y) {
    new powerup(x, y, 15, [0, 3], splitball, splitballpower)
});

function bullet(x, y, vector, creator) {
    this.x = x;
    this.y = y;
    this.vector = vector;
    this.creator = function() {creator(this.x, this.y)};
    firedbullets.push(this);
}
var crbullet = function(x, y) {
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, 4, 15);
}
function fireBullet() {
    new bullet(paddle.x + paddle.width / 2 - 2, paddle.y, [0, -15], crbullet);
    bullets -= 1;
}
var gunpower = function () {
    bullets += 15;
}
var gunpowerup = function(x, y) {
    ctx.fillStyle = "blue";
    ctx.fillRect(x - 13, y - 5, 26, 10);
    ctx.fillStyle = "red";
    ctx.fillRect(x - 1, y - 12, 2, 7);
}
powerups.push(function(x, y) {
    new powerup(x, y, 15, [0, 4], gunpowerup, gunpower)
});

function level0() {
    maxspeed = 10;
    for (var q=0;q<3;q++) {
        for (var i=1;i<21;i++) {
            var block = new rect(50 + (i * 41), 50 + (q * 21), 40, 20, [0, 0], redRect);
        }
    }
    var ball = new circle(200, 400, 30, [0, 0], yellowBall);
    for (var i=0;i<2;i++) {
        var ball = new circle(200, 400, 20, [0, 0], yellowBall);
    }
    paddle = new rect(400, 600, 100, 30, [0, 0], blueRect, true);
}
levels.push(level0);

function level1() {
    maxspeed = 10;
    for (var i=0;i<40;i++) {
        var block = new rect(Math.round(Math.random() * 900), Math.round(Math.random() * 500), 40, 20, [0, 0], redRect);
    }
    for (var i=0;i<3;i++) {
        var ball = new circle(200, 400, 20, [0, 0], yellowBall);
    }
    paddle = new rect(400, 600, 100, 30, [0, 0], blueRect, true);
}
levels.push(level1);

function level2() {
    maxspeed = 10;
    var alt = false;
    for (var q=0;q<8;q++) {
        for (var i=1;i<22;i++) {
            if (alt) {
                alt = false;
                continue;
            } else {alt = true;}
            var block = new rect(30 + (i * 41), 50 + (q * 21), 40, 20, [0, 0], redRect);
        }
    }
    for (var i=0;i<3;i++) {
        var ball = new circle(200, 400, 20, [0, 0], yellowBall);
    }
    var ball = new circle(200, 400, 10, [0, 0], yellowBall);
    paddle = new rect(400, 600, 100, 30, [0, 0], blueRect, true);
}
levels.push(level2);

function level3() {
    maxspeed = 10;
    for (var q=0;q<4;q++) {
        for (var i=1;i<21;i++) {
            var block = new rect(50 + (i * 41), 50 + (q * 42), 40, 20, [0, 0], redRect);
        }
    }
    for (var i=0;i<3;i++) {
        var ball = new circle(200, 400, 10, [0, 0], yellowBall);
    }
    paddle = new rect(400, 600, 70, 30, [0, 0], blueRect, true);
}
levels.push(level3);

function level4() {
    maxspeed = 10;
    for (var i=0;i<60;i++) {
        var block = new rect(Math.round(Math.random() * 900), Math.round(Math.random() * 500), 60, 30, [0, 0], redRect);
    }
    for (var i=0;i<3;i++) {
        var ball = new circle(200, 400, 30, [0, 0], yellowBall);
    }
    paddle = new rect(400, 600, 100, 30, [0, 0], blueRect, true);
}
levels.push(level4);

function level5() {
    maxspeed = 20;
    for (var q=0;q<8;q++) {
        for (var i=1;i<21;i++) {
            if (Math.random() * 3 > 2) {continue;}
            var block = new rect(50 + (i * 41), 50 + (q * 31), 40, 20, [0, 0], redRect);
        }
    }
    for (var i=0;i<3;i++) {
        var ball = new circle(200, 400, 20, [0, 0], yellowBall);
    }
    paddle = new rect(400, 600, 80, 30, [0, 0], blueRect, true);
}
levels.push(level5);

var cookie = document.cookie.split("; ");
for (var i=0;i<cookie.length;i++) {
    var cooki = cookie[i].split("=");
    if (cooki[0] == "breakout") {currentlevel = parseInt(cooki[1]);}
}

requestAnimationFrame(animate);
levels[currentlevel]();
