<script lang="ts">
  import { Ball } from "$lib/ball";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
  import { onMount } from "svelte";
  //'$lib/config.config.json'

  let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let canvas: HTMLDivElement;
  let balls: Ball[] = [];
  let raycaster: THREE.Raycaster;
  let mouseDownPos = new THREE.Vector2();
  let selectedBall: Ball | null = null;
  let arrowHelper: THREE.ArrowHelper;

  let toggleOrbitControl = true;

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "o") {
      toggleOrbitControl = !toggleOrbitControl;
      controls.enabled = toggleOrbitControl;
    }
  }

  let isMouseDown = false;

  function onMouseDown(event: MouseEvent) {
    // Store mouse down position
    isMouseDown = true;
    mouseDownPos.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouseDownPos.y =
      -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    // Get the selected ball
    raycaster.setFromCamera(mouseDownPos, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    const intersectedBall = intersects.find((intersect) =>
      intersect.object.name.includes("ball"),
    );

    if (intersectedBall) {
      selectedBall =
        balls.find((ball) => ball.mesh.name === intersectedBall.object.name) ||
        null;
      selectedBall?.selected(true);
      controls.enabled = false; // Disable orbit controls
      //make arrow helper visible
      arrowHelper.visible = true;
      //set the arrow helper to the selected ball
      if (selectedBall) {
        arrowHelper.setDirection(
          new THREE.Vector3(selectedBall.speed.x, 0, selectedBall.speed.y),
        );
        arrowHelper.position.copy(selectedBall.mesh.position);
      }
    }
  }

  function onMouseMove(event: MouseEvent) {
    if (!isMouseDown || !selectedBall) return;

    const mousePos = new THREE.Vector2(
      (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
      -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    );

    raycaster.setFromCamera(mousePos, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.88);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    const direction = new THREE.Vector3();
    direction
      .subVectors(intersectPoint, selectedBall.mesh.position)
      .normalize();

    arrowHelper.setDirection(direction);
    arrowHelper.position.copy(selectedBall.mesh.position);
  }

  function onMouseUp(event: MouseEvent) {
    isMouseDown = false;
    selectedBall?.selected(false);
    controls.enabled = true; // Enable orbit controls
    arrowHelper.visible = false; // Hide arrow helper
    if (!selectedBall) return;

    // Calculate the mouse up position
    const mouseUpPos = new THREE.Vector2();
    mouseUpPos.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouseUpPos.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    // Set raycaster from camera using the mouse up position
    raycaster.setFromCamera(mouseUpPos, camera);

    // Create a plane at y = 0.88 and find the intersection
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.88);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    // Calculate the direction vector from the selected ball's position to the intersection point
    const direction = new THREE.Vector3();
    direction
      .subVectors(intersectPoint, selectedBall.mesh.position)
      .normalize();

    // Update the arrowHelper to point towards this direction
    arrowHelper.setDirection(direction);
    arrowHelper.position.copy(selectedBall.mesh.position);

    // Calculate new speed based on the direction
    selectedBall.speed = new THREE.Vector2(direction.x, direction.z);

    selectedBall = null; // Clear the selection
  }

  onMount(() => {
    init();
    canvas.addEventListener("mousedown", onMouseDown, false);
    canvas.addEventListener("mouseup", onMouseUp, false);
    canvas.addEventListener("mousemove", onMouseMove, false);
    window.addEventListener("keydown", onKeyDown, false);
    //add window resize listener
    window.addEventListener("resize", onWindowResize, false);
    animate();
  });

  function init() {
    // Initialize the scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 2, -2);
    //rotate camera
    camera.rotation.x = -Math.PI / 2;
    camera.lookAt(0, 0, 0);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvas.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    // ray caster
    raycaster = new THREE.Raycaster();

    // Import billboard model
    const loader = new GLTFLoader();
    loader.load(
      "assest/table.glb",
      (gltf) => {
        //import models only
        const table = gltf.scene;
        scene.add(table);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.log(error);
      },
    );

    // Add ambient light#
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // Add point light
    const pointLight = new THREE.PointLight(0xff00ff, 50);
    pointLight.position.set(0, 2, 2);
    scene.add(pointLight);
    const pointLight2 = new THREE.PointLight(0x0000ff, 50);
    pointLight2.position.set(2, 2, 0);
    scene.add(pointLight2);
    // set wall bounds
    const wallBounds = {
      minX: -2.54 / 2,
      maxX: 2.54 / 2,
      minZ: -1.27 / 2,
      maxZ: 1.27 / 2,
    };

    // Add balls position
    //        *
    //       * *
    //      * * * 
    //     * * * *

    let settings = {
      balls: [
        {
          modelUrl: "assest/balll_1.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0, 0.88, 0],
          color: "#ff0000",
        },
        {
          modelUrl: "assest/balll_2.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.06, 0.88, 0.06],
          color: "#0000ff",
        },
        {
          modelUrl: "assest/balll_3.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.06, 0.88, -0.06],
          color: "#0000ff",
        },
        {
          modelUrl: "assest/balll_4.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.12, 0.88, 0.12],
          color: "#00ff00",
        },
        {
          modelUrl: "assest/balll_5.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.12, 0.88, 0],
          color: "#00ff00",
        },
        {
          modelUrl: "assest/balll_6.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.12, 0.88, -0.12],
          color: "#00ff00",
        },
        {
          modelUrl: "assest/balll_7.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.18, 0.88, 0.18],
          color: "#ff00ff",
        },
        {
          modelUrl: "assest/balll_8.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.18, 0.88, 0.06],
          color: "#ff00ff",
        },
        {
          modelUrl: "assest/balll_9.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.18, 0.88, -0.06],
          color: "#ff00ff",
        },
        {
          modelUrl: "assest/balll_10.glb",
          speed: [0, 0],
          mass: 0.17,
          radius: 0.03,
          position: [0.18, 0.88, -0.18],
          color: "#ff00ff",
        },
        {
          modelUrl: "assest/ball_white.glb",
          speed: [0, 0],
          mass: 2,
          radius: 0.03,
          position: [-0.5, 0.88, 0],
          color: "#ffffff",
        },
      ],
    };
    //

    arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      0.1,
      0xff0000,
    );
    scene.add(arrowHelper);
    // Add balls
    for (let i = 0; i < settings.balls.length; i++) {
      const ball = settings.balls[i];
      const ballObj = new Ball({
        modelUrl: ball.modelUrl,
        speed: new THREE.Vector2(ball.speed[0], ball.speed[1]),
        mass: ball.mass,
        radius: ball.radius,
        position: new THREE.Vector3(
          ball.position[0],
          ball.position[1],
          ball.position[2],
        ),
        //invisible material
        material: new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0,
        }),
      });
      ballObj.mesh.name = "ball" + i; // Assign a unique name
      ballObj.setWallBounds(wallBounds);
      balls.push(ballObj);
      scene.add(ballObj.mesh);
      if (ballObj.glbMesh) {
        scene.add(ballObj.glbMesh);
      }
      // scene.add(ballObj.arrowHelper); //for checking the direction of the ball
    }

    //

    // Resize listener
    window.addEventListener("resize", onWindowResize, false);
  }

  function onWindowResize() {
    (camera as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  let delta = 0; // Seconds since last frame

  let timeSinceStart = 0; // Seconds since start of simulation
  function animate() {
    const now = performance.now();
    const secondsSinceLastFrame = (now - delta) / 1000;
    delta = now;
    //iterate through balls for i in range i and j
    timeSinceStart += secondsSinceLastFrame;
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      ball.updatePlace(secondsSinceLastFrame);
      for (let j = i + 1; j < balls.length; j++) {
        const otherBall = balls[j];
        if (ball.detectCollision(otherBall)) {
          ball.handleCollision(otherBall);
        }
      }
    }

    requestAnimationFrame(animate);

    renderer.render(scene, camera);
  }
</script>

<div bind:this={canvas}></div>

<style>
  div {
    width: 100%;
    height: 100vh;
  }
</style>
