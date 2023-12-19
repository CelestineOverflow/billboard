// // Billboard.js

// import * as THREE from 'three';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// export class Billboard {
//     public model: THREE.Object3D | null = null;
//     private scene: any;
//     private modelUrl: any;
//     private balls: any;

//     constructor(scene: any, modelUrl: any) {
//         this.scene = scene;
//         this.modelUrl = modelUrl;
//         this.model = null;

//         this.loadModel();
//     }

//     loadModel() {
//         const loader = new GLTFLoader();
//         loader.load(
//             this.modelUrl,
//             (gltf) => {
//                 this.model = gltf.scene;
//                 this.scene.add(this.model);
//             },
//             undefined,
//             (error) => {
//                 console.error('An error happened while loading the model:', error);
//             }
//         );
//     }

//     updateTransform(delta: any) {
//         for (const ball of this.balls) {
//             ball.updatePlace(secondsSinceLastFrame, balls);
      
//           }
//     }
// }
