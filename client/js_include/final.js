// Keep globals clean.
var currentModel = null;
var renderer = null;
var scene = null;
var camera = null;
var view = null;
var timer = null;

var server = 'localhost:8080';

// Create a variable at the top-level scope so everyone can see it.
var ws = null;

// Initialize a preview scene with a model, and colour.
function previewScene(modelName, modelSource, color)
  {
  var container = document.getElementById('preview-' + modelName);
              
  // Create a renderer.
  var renderer =
    new
      THREE.WebGLRenderer(
        {
        antialias: true,
        alpha: true
        });

  // Use the full window size with clear background.
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setClearColor(0x000000, 0);

  // Add the renderer to the DOM.
  container.appendChild(renderer.domElement);

  // Create a scene.
  var scene = new THREE.Scene();

  // Create a camera.
  var camera =
    new
      THREE.PerspectiveCamera(
        75,
        container.offsetWidth / container.offsetHeight,
        1,
        1000 );

  // Don't get too close.
  camera.position.z = 10;

  // Add the camera to the scene.
  scene.add(camera);

  // Setup some mood lighting.
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.95);

  dirLight.position.set(-3, 3, 7);
  dirLight.position.normalize();
  scene.add(dirLight);
 
  // And some additional lighting.
  var pointLight = new THREE.PointLight(0xFFFFFF, 5, 50);

  pointLight.position.set(10, 20, -10);
  scene.add(pointLight);

  // Now load the model.
  var jsonLoader = new THREE.JSONLoader();

  jsonLoader.load(
    modelSource,
    function(geometry)
      {
      // Compute vertex normals to make the entire model smooth.
      geometry.computeVertexNormals();

      var model =
        new
          THREE.Mesh(
            geometry, new THREE.MeshPhongMaterial({color: color}));
      
      // Add the model.
      scene.add(model);
      
      $(container).css('background-image', 'none');

      requestAnimationFrame(
        function()
          {
          renderer.render(scene, camera);
          });
      });      
  }

// Initialize a scene with an id, model, and colour.
function initScene(modelSource, color)
  {
  var container = document.getElementById('container');
  
  var parent = document.getElementById('threedpane');
  
  // Create a renderer.
  renderer =
    new
      THREE.WebGLRenderer(
        {
        antialias: true,
        alpha: true
        });

  // Use the full window size with clear background.
  renderer.setSize(parent.offsetWidth, parent.offsetHeight);
  renderer.setClearColor(0x000000, 0);

  // Add the renderer to the DOM.
  container.appendChild(renderer.domElement);

  view = renderer.domElement;
  
  // Create a scene.
  scene = new THREE.Scene();

  // Create a camera.
  camera =
    new
      THREE.PerspectiveCamera(
        75,
        container.offsetWidth / container.offsetHeight,
        1,
        1000 );

  // Don't get too close.
  camera.position.z = 10;

  // Add the camera to the scene.
  scene.add(camera);

  // Add some simple controls to look at the pretty model.
  controls = 
    new THREE.TrackballControls(
      camera, 
      renderer.domElement, 
      function(object)
	      {
	      var message = 
	        {
	        action: 'update',
	        name: currentModel,
	        update: object
	        };
	        
	      ws.send(JSON.stringify(message));
	      });

  // Setup the controls with some good defaults.
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.2;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.3;

  controls.minDistance = 1.1;
  controls.maxDistance = 100;

  // [ rotateKey, zoomKey, panKey ]
  controls.keys = [ 16, 17, 18 ];

  // Setup some mood lighting.
  var dirLight = new THREE.DirectionalLight(0xffffff, 0.95);

  dirLight.position.set(-3, 3, 7);
  dirLight.position.normalize();
  scene.add(dirLight);
 
  // And some additional lighting.
  var pointLight = new THREE.PointLight(0xFFFFFF, 5, 50);

  pointLight.position.set(10, 20, -10);
  scene.add(pointLight);

  // Now load the model.
  var jsonLoader = new THREE.JSONLoader();

  jsonLoader.load(
    modelSource,
    function(geometry)
      {
      // Compute vertex normals to make the entire model smooth.
      geometry.computeVertexNormals();

      var model =
        new
          THREE.Mesh(
            geometry, new THREE.MeshPhongMaterial({color: color}));
      
      // Add the model.
      scene.add(model);

      $(parent).css('background-image', 'none');

      requestAnimationFrame(
        function()
          {
          renderer.render(scene, camera);
          });
      });
  }

// Start listening for events.
function listenToEvents()
  {
  // Listen for the start of user interaction.
  view.addEventListener('mousedown', startListeningToEvents);
  view.addEventListener('touchstart', startListeningToEvents);
  
  // The mouse wheel event is special, just manually update it.
  view.addEventListener('mousewheel', updateMouseWheel);
  view.addEventListener('DOMMouseScroll', updateMouseWheel);
  }

// Manually update the display in response to mouse wheel events.
function updateMouseWheel()
  {
  requestAnimationFrame(
    function()
      {
      controls.update();

      renderer.render(scene, camera);
      });
  }
 
// Start listening for mouse events. 
function startListeningToEvents()
  {
  // Setup a timer to update the display independently from user interface events.
  timer = 
    setInterval(
      function()
        {
        requestAnimationFrame(
          function()
            {
            controls.update();
      
            renderer.render(scene, camera);
            });
        },
      10);
      
  // Now listen for user interface vents.
  view.addEventListener('mouseup', stopListeningToEvents);
  view.addEventListener('mouseout', stopListeningToEvents);
  view.addEventListener('touchend', stopListeningToEvents);
  }

// Stop listening for user interface events.  
function stopListeningToEvents()
  {
  // Stop updating the display.
  clearInterval(timer);
  
  view.removeEventListener('mouseup', stopListeningToEvents);
  view.removeEventListener('mouseout', stopListeningToEvents);
  view.removeEventListener('touchend', stopListeningToEvents);
  }
  
// Once the document is ready, setup the interface and bind functions to 
// DOM elements.
$(document).ready(
  function ()
    {
    // Hide upload controls.
    $('#uploadmodel').css('display', 'none');
    
    // Disable disconnect at start.
    $('#disconnect').prop('disabled', true);
    
    // Bind function to establish connection to connect button.
    $('#connect').click(
      function ()
        {
        // Connect the global variable to the server.
        ws = new WebSocket('ws://' + server);

        // I am connected.
        ws.onopen = 
          function()
            {
            // Show upload controls.
            $('#uploadmodel').fadeIn();

            // Disallow repeated connect requests.
            $('#connect').prop('disabled', true);
            
            // Allow disconnect.
            $('#disconnect').prop('disabled', false);
            
            // Load models.
            angular.element($('#controller')).scope().loadModels();
            };

        // Handle a message from the server.
        ws.onmessage = 
          function(event) 
            { 
            // WebSockets does text and binary, not structured data.
            // Manually parse the JSON.
            var message = JSON.parse(event.data);
            
            if(message.action == 'update')
              {
              // Only update the model if it matches the current model.
              if(message.name == currentModel)
                {
                controls.handleRemoteEvent(message.update);

                requestAnimationFrame(
                  function()
                    {
                    renderer.render(scene, camera);
                    });
                }
              }
            else if(message.action == 'newmodel')
              {
              // Clear things out.
              angular.element($('#controller')).scope().clear().$apply();
    
              // Load models.
              angular.element($('#controller')).scope().loadModels();
              }
            else if(message.action == 'deletemodel')
              {
              // Clear things out.
              angular.element($('#controller')).scope().clear().$apply();
    
              // Load models.
              angular.element($('#controller')).scope().loadModels();
              }
            };

        // Let the user know the connection closed.
        ws.onclose = 
          function()
            {
            // Reset the current model. 
            currentModel = null;
            
            // Hide upload controls.
            $('#uploadmodel').fadeOut();

            // Reenable connections.
            $('#connect').prop('disabled', false);

            // Disallow repeated disconnect requests.
            $('#disconnect').prop('disabled', true);

            // Clear things out.
            angular.element($('#controller')).scope().clear().$apply();

            // Delete the old container.
            $('#container').remove();
            };
        });
    
    // Bind function to disconnect to the disconnect button.
    $('#disconnect').click(
      function ()
        {
        // Manually disconnect from websockets, even though I don't need to.
        ws.close();
        });
    });

// Manage 3D models using AngularJS.
function ThreeDModel($scope)
  {
  window.scope = $scope;
  
  // Create a model for a 3d models.
  $scope.threedmodels = {};
  $scope.file = null;

  // Load all models from the server.
  $scope.loadModels =
    function ()
      {
      $.ajax(
        {
        url: "http://" + server + "/models/",
    
        success:
          function(data)
            {
            $scope.threedmodels = data;
        
            $scope.$apply();
        
            for(var i in $scope.threedmodels)
              {
              var threedmodel = $scope.threedmodels[i];

              previewScene(
                threedmodel.name,
                "http://" + server + "/models/" + threedmodel.name, 
                0x009900);
              }
            }
        });
      };
  
  // Load a model.
  $scope.loadModel =
    function ($threedmodel)
      {
      // Delete the old container.
      $('#container').remove();
  
      // Add a new container.
      $('#threedpane').append('<div id="container"></div>');

      $('#threedpane').css('background-image', 'url(images/loading-big.gif)');
  
      // Set the current model.
      currentModel = $threedmodel;
  
      initScene("http://" + server + "/models/" + currentModel, 0x009900);
  
      listenToEvents();
  
      // Return the scope in case the caller wants to manually update.
      return $scope;
      };
  
  // Clear the model.
  $scope.clear =
    function ()
      {
      $scope.threedmodels = {};
  
      // Return the scope in case the caller wants to manually update.
      return $scope;
      };
  
  // Set the upload file.
  $scope.setFile =
    function (element)
      {
      $scope.$apply(
        function ()
          {
          $scope.file = element.files[0];
          });
      };
      
  // Upload a file.
  $scope.uploadModel = 
    function () 
      {
      var formData = new FormData();
      formData.append("file", $scope.file, $scope.file.name);

      $.ajax(
        {
        url: "http://" + server + "/models/" + $scope.file.name,
        type: "PUT",
        data: formData,
        processData: false,
        contentType: false,
        });
      };
  }

