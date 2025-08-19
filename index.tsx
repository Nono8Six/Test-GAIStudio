/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as THREE from 'three';

const { useEffect, useRef, useState } = React;

// Three.js Background Component
const ThreeJSBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        let scene, camera, renderer, points, lines;
        const mouse = new THREE.Vector2(-10, -10);

        const PARAMS = {
            particleCount: 800,
            boxSize: 100,
            particleColor: 0x007cf0,
            lineColor: 0xcccccc,
            mouseRadius: 10,
            repulsionForce: 0.5,
            returnSpeed: 0.02,
        };

        const init = () => {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 50;

            renderer = new THREE.WebGLRenderer({
                canvas: canvasRef.current,
                antialias: true,
                alpha: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const particlesGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(PARAMS.particleCount * 3);
            const originalPositions = new Float32Array(PARAMS.particleCount * 3);
            const velocities = new Float32Array(PARAMS.particleCount * 3).fill(0);

            for (let i = 0; i < PARAMS.particleCount; i++) {
                const i3 = i * 3;
                positions[i3] = (Math.random() - 0.5) * PARAMS.boxSize;
                positions[i3 + 1] = (Math.random() - 0.5) * PARAMS.boxSize;
                positions[i3 + 2] = (Math.random() - 0.5) * PARAMS.boxSize;
                originalPositions[i3] = positions[i3];
                originalPositions[i3 + 1] = positions[i3 + 1];
                originalPositions[i3 + 2] = positions[i3 + 2];
            }
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particlesGeometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3));
            particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
            
            const particlesMaterial = new THREE.PointsMaterial({
                color: PARAMS.particleColor,
                size: 0.2,
                sizeAttenuation: true
            });
            points = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(points);

            // Lines
            const linePositions = [];
            for (let i = 0; i < PARAMS.particleCount; i += 4) { // Connect fewer points for clarity
                 if (i + 1 < PARAMS.particleCount) {
                    const i3 = i * 3;
                    const j3 = (i + 1) * 3;
                    linePositions.push(positions[i3], positions[i3 + 1], positions[i3 + 2]);
                    linePositions.push(positions[j3], positions[j3 + 1], positions[j3 + 2]);
                 }
            }
            const lineGeometry = new THREE.BufferGeometry();
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            const lineMaterial = new THREE.LineBasicMaterial({ color: PARAMS.lineColor, transparent: true, opacity: 0.2 });
            lines = new THREE.LineSegments(lineGeometry, lineMaterial);
            scene.add(lines);


            window.addEventListener('resize', onWindowResize, false);
            document.addEventListener('mousemove', onPointerMove, false);
            document.addEventListener('mouseleave', onPointerLeave, false);
            
            animate();
        };

        const onPointerMove = (event: MouseEvent) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };
        
        const onPointerLeave = () => {
             mouse.x = -10;
             mouse.y = -10;
        };
        
        const onWindowResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        const animate = () => {
            requestAnimationFrame(animate);
            
            const positions = points.geometry.attributes.position.array as Float32Array;
            const originalPositions = points.geometry.attributes.originalPosition.array as Float32Array;
            const velocities = points.geometry.attributes.velocity.array as Float32Array;

            const target = new THREE.Vector3();
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            target.copy(raycaster.ray.direction).multiplyScalar(camera.position.z).add(camera.position);

            for (let i = 0; i < PARAMS.particleCount; i++) {
                const i3 = i * 3;
                
                const dx = positions[i3] - target.x;
                const dy = positions[i3 + 1] - target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < PARAMS.mouseRadius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (PARAMS.mouseRadius - dist) * PARAMS.repulsionForce;
                    velocities[i3] += Math.cos(angle) * force;
                    velocities[i3 + 1] += Math.sin(angle) * force;
                }

                // Return to original position
                velocities[i3] -= (positions[i3] - originalPositions[i3]) * PARAMS.returnSpeed;
                velocities[i3 + 1] -= (positions[i3 + 1] - originalPositions[i3 + 1]) * PARAMS.returnSpeed;
                velocities[i3 + 2] -= (positions[i3 + 2] - originalPositions[i3 + 2]) * PARAMS.returnSpeed;

                // Damping
                velocities[i3] *= 0.95;
                velocities[i3 + 1] *= 0.95;
                velocities[i3 + 2] *= 0.95;

                positions[i3] += velocities[i3];
                positions[i3 + 1] += velocities[i3 + 1];
                positions[i3 + 2] += velocities[i3 + 2];
            }
            points.geometry.attributes.position.needsUpdate = true;
            lines.geometry.attributes.position.needsUpdate = true;
            
            scene.rotation.y += 0.0001;
            scene.rotation.x += 0.0002;

            renderer.render(scene, camera);
        };

        init();

        return () => {
            window.removeEventListener('resize', onWindowResize);
            document.removeEventListener('mousemove', onPointerMove);
            document.removeEventListener('mouseleave', onPointerLeave);
        };
    }, []);

    return React.createElement('canvas', { id: 'bg-canvas', ref: canvasRef });
};

// AI Logo Component
const AILogo = () => (
    React.createElement('div', { className: 'logo-container' },
        React.createElement('svg', { className: 'logo-svg', viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg" },
            // Organic brain half
            React.createElement('path', { className: 'brain-organic', d: "M50,10 C30,10 20,30 20,50 C20,70 30,90 50,90 C45,75 40,60 40,50 C40,40 45,25 50,10 Z M45,25 C42,35 42,45 45,55 M30,30 C35,35 35,45 30,50 M35,60 C40,65 40,75 35,80" }),
            
            // AI network half
            React.createElement('g', { className: 'brain-ai' },
              React.createElement('path', { id: 'ai-path-1', d: 'M50,10 L60,20 L55,35 L70,30 L80,45 L70,60 L80,75 L70,80 L55,70 L60,85 L50,90' }),
              React.createElement('path', { id: 'ai-path-2', d: 'M60,20 L70,30 L70,60 L60,85' }),
              React.createElement('circle', { cx: '50', cy: '10', r: '3' }),
              React.createElement('circle', { cx: '60', cy: '20', r: '3' }),
              React.createElement('circle', { cx: '55', cy: '35', r: '2.5' }),
              React.createElement('circle', { cx: '70', cy: '30', r: '3.5' }),
              React.createElement('circle', { cx: '80', cy: '45', r: '3' }),
              React.createElement('circle', { cx: '70', cy: '60', r: '3.5' }),
              React.createElement('circle', { cx: '80', cy: '75', r: '2.5' }),
              React.createElement('circle', { cx: '70', cy: '80', r: '3' }),
              React.createElement('circle', { cx: '55', cy: '70', r: '2.5' }),
              React.createElement('circle', { cx: '60', cy: '85', r: '3' }),
              React.createElement('circle', { cx: '50', cy: '90', r: '3' }),
              React.createElement('circle', { className: 'spark spark-1', r: '2.5', motion: "path('M50,10 L60,20 L55,35 L70,30')" }),
              React.createElement('circle', { className: 'spark spark-2', r: '2.5', motion: "path('M50,90 L60,85 L70,80 L80,75')" }),
              React.createElement('circle', { className: 'spark spark-3', r: '2', motion: "path('M70,30 L80,45 L70,60')" }),
              React.createElement('circle', { className: 'spark spark-4', r: '2', motion: "path('M60,20 L70,30 L70,60')" })
            )
        )
    )
);

// Google Icon SVG Component
const GoogleIcon = () => (
    React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 48 48", width: "24px", height: "24px", "aria-hidden": "true" },
        React.createElement('path', { fill: "#FFC107", d: "M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" }),
        React.createElement('path', { fill: "#FF3D00", d: "M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" }),
        React.createElement('path', { fill: "#4CAF50", d: "M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" }),
        React.createElement('path', { fill: "#1976D2", d: "M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,34.556,44,29.865,44,24C44,22.659,43.862,21.35,43.611,20.083z" })
    )
);

// Login Form Component
const LoginForm = () => {
    return React.createElement('div', { className: 'login-container' },
        React.createElement(AILogo, null),
        React.createElement('h1', { className: 'title' }, 'AI Foundations'),
        React.createElement('p', { className: 'subtitle' }, 'Bienvenue. Connectez-vous pour continuer.'),
        React.createElement('form', { onSubmit: (e: React.FormEvent) => e.preventDefault() },
            React.createElement('div', { className: 'form-group' },
                React.createElement('input', { type: 'email', id: 'email', name: 'email', required: true, placeholder: ' ' }),
                React.createElement('label', { htmlFor: 'email' }, 'Adresse e-mail'),
                React.createElement('span', {className: 'input-border'})
            ),
            React.createElement('div', { className: 'form-group' },
                React.createElement('input', { type: 'password', id: 'password', name: 'password', required: true, placeholder: ' ' }),
                React.createElement('label', { htmlFor: 'password' }, 'Mot de passe'),
                React.createElement('span', {className: 'input-border'})
            ),
            React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Se Connecter'),
        ),
        React.createElement('div', { className: 'separator' }, 'OU'),
        React.createElement('button', { type: 'button', className: 'btn btn-google' },
            React.createElement(GoogleIcon, null),
            'Continuer avec Google'
        ),
        React.createElement('div', { className: 'form-footer' },
            React.createElement('a', { href: '#' }, 'Mot de passe oublié ?'),
            React.createElement('p', null,
                "Pas encore de compte ?",
                React.createElement('a', { href: '#' }, "S'inscrire")
            )
        )
    );
};


// Main App Component
const App = () => {
    return React.createElement(React.Fragment, null,
        React.createElement(ThreeJSBackground, null),
        React.createElement(LoginForm, null)
    );
};

// Render the app
const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App, null));
}