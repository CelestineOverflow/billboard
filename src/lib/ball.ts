

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Ball {

    public mesh: THREE.Mesh;
    public speed: THREE.Vector2;
    public mass: number;
    public radius: number;
    public arrowLength: number;
    public arrowHelper: THREE.ArrowHelper;
    public glbMesh: THREE.Group | undefined;
    private wallBounds: { minX: number, maxX: number, minZ: number, maxZ: number };

    constructor(config: any) {
        const { modelUrl, speed, mass, radius, position, material } = config;
        const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
        this.mesh = new THREE.Mesh(sphereGeometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.mass = mass;
        this.radius = radius;
        this.speed = speed;
        this.wallBounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
        this.arrowLength = 1;

        // Arrow helper setup
        const arrowColor = 0x00ff00;
        const arrowDirection = new THREE.Vector3(0, 1, 0);
        
        this.arrowHelper = new THREE.ArrowHelper(arrowDirection, position, this.arrowLength, arrowColor);

        // GLTF model loading
        const loader = new GLTFLoader();
        loader.load(modelUrl, (gltf) => {
            this.glbMesh = gltf.scene;
            this.glbMesh.scale.set(radius, radius, radius);
            this.mesh.add(this.glbMesh); // Add the model as a child of the physics mesh
        });



    }

    detectCollision(otherBall: Ball) {
        const distance = this.mesh.position.distanceTo(otherBall.mesh.position);
        return distance < (this.radius + otherBall.radius);

    }

    selected(isSelected: boolean) {
        if (isSelected) {
            this.mesh.material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        } else {
            //invisible
            this.mesh.material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
        }
    }

    


    handleCollision(otherBall: Ball, dampingFactor = 1) {
        // Calculate the angle of the line of impact
        const dx = otherBall.mesh.position.x - this.mesh.position.x;
        const dz = otherBall.mesh.position.z - this.mesh.position.z;
        const collisionAngle = Math.atan2(dz, dx);

        // Decompose velocities into normal and tangential components
        const speed1Normal = this.speed.x * Math.cos(collisionAngle) + this.speed.y * Math.sin(collisionAngle);
        const speed1Tangent = this.speed.y * Math.cos(collisionAngle) - this.speed.x * Math.sin(collisionAngle);
        const speed2Normal = otherBall.speed.x * Math.cos(collisionAngle) + otherBall.speed.y * Math.sin(collisionAngle);
        const speed2Tangent = otherBall.speed.y * Math.cos(collisionAngle) - otherBall.speed.x * Math.sin(collisionAngle);

        // Elastic collision equations for the normal components
        const newSpeed1Normal = (speed1Normal * (this.mass - otherBall.mass) + 2 * otherBall.mass * speed2Normal) / (this.mass + otherBall.mass);
        const newSpeed2Normal = (speed2Normal * (otherBall.mass - this.mass) + 2 * this.mass * speed1Normal) / (this.mass + otherBall.mass);

        // Convert back to x and y components
        this.speed.x = newSpeed1Normal * Math.cos(collisionAngle) - speed1Tangent * Math.sin(collisionAngle);
        this.speed.y = newSpeed1Normal * Math.sin(collisionAngle) + speed1Tangent * Math.cos(collisionAngle);
        otherBall.speed.x = newSpeed2Normal * Math.cos(collisionAngle) - speed2Tangent * Math.sin(collisionAngle);
        otherBall.speed.y = newSpeed2Normal * Math.sin(collisionAngle) + speed2Tangent * Math.cos(collisionAngle);

        // Post-collision displacement
        const overlap = (this.radius + otherBall.radius) - new THREE.Vector2(dx, dz).length();
        const displacement = overlap / 2;
        this.mesh.position.x -= displacement * Math.cos(collisionAngle);
        this.mesh.position.z -= displacement * Math.sin(collisionAngle);
        otherBall.mesh.position.x += displacement * Math.cos(collisionAngle);
        otherBall.mesh.position.z += displacement * Math.sin(collisionAngle);
    }

    detectWallCollision(wallBounds: { minX: number, maxX: number, minZ: number, maxZ: number }) {
        let collision = { x: false, y: false, z: false };
        let position = this.mesh.position;
        if (position.x - this.radius < wallBounds.minX || position.x + this.radius > wallBounds.maxX) {
            collision.x = true;
        }
        if (position.z - this.radius < wallBounds.minZ || position.z + this.radius > wallBounds.maxZ) {
            collision.y = true;
        }
        return collision;
    }

    handleWallCollision2D(wallCollision: any, dampingFactor = 0.9) {
        if (wallCollision.x) {
            this.speed.x = -this.speed.x * dampingFactor;
        }
        if (wallCollision.y) {
            this.speed.y = -this.speed.y * dampingFactor;
        }
    }

    updatePlace(deltaTime: number, frictionCoefficient = 0.999) {

        // Current position
        let oldPosition = new THREE.Vector3();
        oldPosition.copy(this.mesh.position);
        // Update position
        let position = this.mesh.position;
        position.x += this.speed.x * deltaTime;
        position.z += this.speed.y * deltaTime;

        // Calculate distance moved
        let distanceMoved = oldPosition.distanceTo(position);

        // Direction of movement
        let direction = new THREE.Vector3();
        direction.subVectors(position, oldPosition).normalize();

        // Convert distance moved to radians (negate the angle)
        let radians = -(distanceMoved / (this.radius * 2 * Math.PI)) * 2 * Math.PI;

        // Calculate rotation axis (perpendicular to the direction of movement)
        let upVector = new THREE.Vector3(0, 1, 0);
        let rotationAxis = new THREE.Vector3().crossVectors(direction, upVector).normalize();

        // Create quaternion for rotation
        let quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(rotationAxis, radians);

        // Apply quaternion rotation
        this.mesh.quaternion.multiplyQuaternions(quaternion, this.mesh.quaternion);


        // Check for wall collision
        let wallCollision = this.detectWallCollision(this.wallBounds);
        this.handleWallCollision2D(wallCollision);

        // desaceleracion by friction

        this.speed.x *= frictionCoefficient;
        this.speed.y *= frictionCoefficient;
        // Update arrow helper
        this.arrowHelper.position.copy(this.mesh.position);

        // // Update arrow direction and length
        let arrowDirection = new THREE.Vector3(this.speed.x, 0, this.speed.y).normalize();
        this.arrowHelper.setDirection(arrowDirection);
        this.arrowHelper.setLength(1. * this.speed.length());


    }

    setSpeed(speed: THREE.Vector2) {
        this.speed = speed;
    }
    toggleArrowHelper() {
        this.arrowHelper.visible = !this.arrowHelper.visible;
    }






    setWallBounds(wallBounds: { minX: number, maxX: number, minZ: number, maxZ: number }) {
        this.wallBounds = wallBounds;
    }

}
