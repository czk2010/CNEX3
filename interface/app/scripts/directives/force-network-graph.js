'use strict';

angular.module('interfaceApp')
  .directive('forceNetworkGraph', [ '$window', '$http', '$timeout', 'configuration',  function ($window, $http, $timeout, configuration) {
    return {
      templateUrl: 'views/force-network-graph.html',
      restrict: 'E',
      scope: {
          site: '@',
          graph: '@'
      },
      link: function postLink(scope, element, attrs) {
          //scope.$watch('graph', function(graph) {
          //    if (graph) { scope.drawGraph(); }
          //});

          var init = function() {
              scope.service = configuration[configuration.service];
              scope.progress = true;
              scope.datasetError = false;
              scope.total = 0;
              scope.processed = 0;

              // kick off the progress update in a moment; needs time to get going..
              $timeout(function() { scope.update(); }, 100);

              var url;
              if (scope.graph == 'byEntity') {
                  url = scope.service + '/graph/' + scope.site + '/byEntity';
              } else if ($routeParams.explore == 'byFunction') {
                  url = scope.service + '/graph/' + scope.site + '/byFunction';
              }
              url += '?callback=JSON_CALLBACK';
              console.log(url);
              $http.jsonp(url).then(function(response) {
                  scope.site_name = response.data.site_name;
                  scope.graph = response.data.graph;
                  scope.drawGraph();
                  scope.progress = false;
              },
              function(response) {
                  scope.datasetError = true;
                  scope.progress = false;
              })
          }
          init();


          scope.update = function() {
              var url = scope.service + '/status/' + scope.site + '?callback=JSON_CALLBACK';
              $http.jsonp(url).then(function(response) {
                  scope.progress = true;
                  scope.processed = response.data['processed'];
                  scope.total = response.data['total'];
                  $timeout(function() { scope.update(); }, 100);
              },
              function(response){
                  scope.progress = false;
              })
          }

          scope.drawGraph = function() {
              var width =  $window.innerWidth;
              var height = $window.innerHeight;

              var color = d3.scale.category20();
              
              var force = d3.layout.force()
                    .charge(-1000)
                    .linkDistance(100)
                    .linkStrength(1)
                    .size([width, height]);

              d3.select('svg').remove();

              var svg = d3.select('#vis')
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .attr('viewBox', '0 0 ' + width + ' ' + height)
                    .attr('preserveAspectRatio', 'xMidYMid meet')
                    .call(d3.behavior.zoom().scaleExtent([0,8]).on('zoom', redraw))
                    .append('svg:g');

              var graph = JSON.parse(scope.graph);
              var nodes = graph.nodes;
              var links = graph.links;

              force.nodes(nodes).links(links).start();

              var link = svg.selectAll('.link')
                    .data(links)
                    .enter()
                    .append('line')
                    .attr('class', 'link')
                    .style('stroke-width', 1);

              var node = svg.append('g')
                    .selectAll('circle')
                    .data(nodes)
                    .enter()
                    .append('circle')
                    .attr('r', function(d) { return scale(d); })
                    .style('fill', function(d) { return color(d.type); })
                    .style('stroke', '#000');
              
              node.on('click', function(d) {
                  scope.node_data = {};
                  scope.node_data.id = d.id;
                  scope.node_data.source = d.source;
                  scope.node_data.name = d.name;
                  scope.node_data.from = d.from;
                  scope.node_data.to = d.to;
                  scope.$apply();
              })

              force.on('tick', function() {
                  link.attr('x1', function(d) { return d.source.x; })
                      .attr('y1', function(d) { return d.source.y; })
                      .attr('x2', function(d) { return d.target.x; })
                      .attr('y2', function(d) { return d.target.y; });

                  node.attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                  });
              })

              function redraw() {
                  svg.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
              }
              function scale(d) {
                  var log = d3.scale.log().range([10,30]);
                  if (d.connections == 0) {
                    return log(1);
                  } else {
                      return log(d.connections);
                  }

              }
          }



      }
    };
  }]);
