var http = require('http');
var events = require('events');
var util = require('util');

function TfsMonitor(url, project, definition, pollInterval) {
  events.EventEmitter.call(this);

  url += '/DefaultCollection/Builds?$select=Number,Definition,Project,Status,RequestedBy&$filter=Project eq \'%s\' and Definition eq \'%s\' and MaxBuildsPerDefinition eq 1 and QueryOrder eq \'FinishTimeDescending\' and StartTime ne datetime\'0001-01-01T00:00:00.000\'&$format=json';
  url = util.format(url, project, definition);

  this.url_ = url;
  this.pollInterval_ = pollInterval || 60000;
  this.listenersCount_ = 0;
  this.timer_ = null;
  this.polling_ = false;
}

util.inherits(TfsMonitor, events.EventEmitter);

TfsMonitor.prototype.onNewListener_ = function(event, listener) {
  if (event == 'build update') {
    this.listenersCount_++;
  }

  if (this.listenersCount_ === 1 && !this.polling_) {
    this.poll();
  }
};

TfsMonitor.prototype.onRemoveListener_ = function(event, listener) {
  if (event == 'build update') {
    this.listenersCount_--;
  }

  if (this.listenersCount_ === 0) {
    this.polling_ = false;
  }
};

TfsMonitor.prototype.poll = function() {
  var self = this;
  self.polling_ = true;

  function pollInner() {
    self.pollBuildStatus_(function(build) {
        self.emit('build update', build);

        if (self.listenersCount_ > 0) {
          self.timer_ = setTimeout(pollInner, self.pollInterval_);
        } else {
          self.polling_ = false;
        }
    });
  }
  pollInner();
};

TfsMonitor.prototype.pollBuildStatus_ = function(callback) {
  http.get(this.url_, function(res) {
    var data = '';

    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      var obj = JSON.parse(data);
      callback(obj.d.results[0]);
    });
  });
};

exports.createMonitor = function(url, project, definition, pollInterval) {
  var monitor = new TfsMonitor(url, project, definition, pollInterval);
  monitor.on('newListener', monitor.onNewListener_);
  monitor.on('removeListener', monitor.onRemoveListener_);
  return monitor;
};