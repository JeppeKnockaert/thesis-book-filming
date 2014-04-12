/**
 * Buffer that keeps the number of running task calls in control
 */

var limit = 1;
var queue = new Array();
var busy = 0;

exports.setTaskBufferLimit = function(size){
    limit = size;
}

exports.doTask = function(task,argumentObject,callback){
    queue.push({"task":task,"arg":argumentObject,"callback":callback});
    if (busy < limit){
        doNext();
    }
}

doNext = function(){
    if (queue.length > 0){
        busy++;
        var newtask = queue.shift(); // Get the task from the front of the queue
        newtask.task(newtask.arg,function(result){
            busy--;
            newtask.callback(result);
            doNext();
        });
        if (busy < limit){
            var callback = doNext;
            var nextTick = process.nextTick;

            process.nextTick = function(callback) {
              if (typeof callback !== 'function') {
                console.trace(typeof callback + ' is not a function');
              }
              return nextTick(callback);
            };
        }
    }
}