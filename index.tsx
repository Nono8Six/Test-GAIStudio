/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as THREE from 'three';

const { useEffect, useRef } = React;

// Three.js Background Component
const ThreeJSBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        let scene, camera, renderer, points, lines;
        let connections: [number, number][] = [];
        const mouse = new THREE.Vector2(-100, -100);
        const clock = new THREE.Clock();

        const PARAMS = {
            particleCount: 250,
            sphereRadius: 35,
            connectionDistance: 12,
            baseColor: 0x818cf8, // Indigo
            interactionColor: 0xe879f9, // Fuchsia
            lineColor: 0x94a3b8, // Slate
            repulsionForce: 0.25,
            returnForce: 0.01,
            damping: 0.95,
            interactionRadius: 18,
        };

        const init = () => {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 60;

            renderer = new THREE.WebGLRenderer({
                canvas: canvasRef.current,
                antialias: true,
                alpha: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // --- Particles (Nodes) ---
            const particlesGeometry = new THREE.BufferGeometry();
            const p_positions = new Float32Array(PARAMS.particleCount * 3);
            const p_velocities = new Float32Array(PARAMS.particleCount * 3).fill(0);
            const p_originalPositions = new Float32Array(PARAMS.particleCount * 3);
            const p_colors = new Float32Array(PARAMS.particleCount * 3);
            const baseColor = new THREE.Color(PARAMS.baseColor);

            for (let i = 0; i < PARAMS.particleCount; i++) {
                const i3 = i * 3;
                const phi = Math.acos(-1 + (2 * i) / PARAMS.particleCount);
                const theta = Math.sqrt(PARAMS.particleCount * Math.PI) * phi;
                
                p_positions[i3] = PARAMS.sphereRadius * Math.cos(theta) * Math.sin(phi);
                p_positions[i3 + 1] = PARAMS.sphereRadius * Math.sin(theta) * Math.sin(phi);
                p_positions[i3 + 2] = PARAMS.sphereRadius * Math.cos(phi);

                p_originalPositions[i3] = p_positions[i3];
                p_originalPositions[i3 + 1] = p_positions[i3 + 1];
                p_originalPositions[i3 + 2] = p_positions[i3 + 2];
                baseColor.toArray(p_colors, i3);
            }
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(p_positions, 3));
            particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(p_velocities, 3));
            particlesGeometry.setAttribute('originalPosition', new THREE.BufferAttribute(p_originalPositions, 3));
            particlesGeometry.setAttribute('color', new THREE.BufferAttribute(p_colors, 3));

            const particlesMaterial = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, sizeAttenuation: true });
            points = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(points);

            // --- Lines (Connections) ---
            const linePositions = [];
            for (let i = 0; i < PARAMS.particleCount; i++) {
                for (let j = i + 1; j < PARAMS.particleCount; j++) {
                    const i3 = i * 3;
                    const j3 = j * 3;
                    const dx = p_positions[i3] - p_positions[j3];
                    const dy = p_positions[i3 + 1] - p_positions[j3 + 1];
                    const dz = p_positions[i3 + 2] - p_positions[j3 + 2];
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < PARAMS.connectionDistance) {
                        connections.push([i, j]);
                        linePositions.push(p_positions[i3], p_positions[i3 + 1], p_positions[i3 + 2]);
                        linePositions.push(p_positions[j3], p_positions[j3 + 1], p_positions[j3 + 2]);
                    }
                }
            }
            const lineGeometry = new THREE.BufferGeometry();
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            const lineMaterial = new THREE.LineBasicMaterial({ color: PARAMS.lineColor, transparent: true, opacity: 0.15 });
            lines = new THREE.LineSegments(lineGeometry, lineMaterial);
            scene.add(lines);

            // --- Event Listeners ---
            window.addEventListener('resize', onWindowResize, false);
            document.addEventListener('mousemove', onPointerMove, false);
            document.addEventListener('touchmove', onPointerMove, { passive: false });
            document.addEventListener('mouseleave', onPointerLeave, false);
            document.addEventListener('touchend', onPointerLeave, false);
            
            animate();
        };

        const onPointerMove = (event: MouseEvent | TouchEvent) => {
            if (event.type === 'touchmove') {
                 (event as TouchEvent).preventDefault();
            }
            let clientX, clientY;
            if ('touches' in event) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            mouse.x = (clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        };
        
        const onPointerLeave = () => {
             mouse.x = -100;
             mouse.y = -100;
        };
        
        const onWindowResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        const animate = () => {
            requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            
            const p_positions = points.geometry.attributes.position.array as Float32Array;
            const p_originalPositions = points.geometry.attributes.originalPosition.array as Float32Array;
            const p_velocities = points.geometry.attributes.velocity.array as Float32Array;
            const p_colors = points.geometry.attributes.color.array as Float32Array;
            
            const l_positions = lines.geometry.attributes.position.array as Float32Array;

            const target = new THREE.Vector3();
            const ray = new THREE.Raycaster();
            ray.setFromCamera(mouse, camera);
            target.copy(ray.ray.direction).multiplyScalar(camera.position.z).add(camera.position);

            const baseColor = new THREE.Color(PARAMS.baseColor);
            const interactionColor = new THREE.Color(PARAMS.interactionColor);
            const tempColor = new THREE.Color();

            for (let i = 0; i < PARAMS.particleCount; i++) {
                const i3 = i * 3;
                
                // Mouse interaction
                const dx = p_positions[i3] - target.x;
                const dy = p_positions[i3 + 1] - target.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                let forceFactor = 0;
                if (distance < PARAMS.interactionRadius) {
                    forceFactor = Math.max(0, 1 - distance / PARAMS.interactionRadius);
                    const angle = Math.atan2(dy, dx);
                    p_velocities[i3] += Math.cos(angle) * forceFactor * PARAMS.repulsionForce;
                    p_velocities[i3 + 1] += Math.sin(angle) * forceFactor * PARAMS.repulsionForce;
                }

                // Color update
                tempColor.setRGB(p_colors[i3], p_colors[i3+1], p_colors[i3+2]);
                const targetColor = forceFactor > 0 ? interactionColor : baseColor;
                tempColor.lerp(targetColor, 0.08);
                tempColor.toArray(p_colors, i3);
                
                // Return to original position force
                p_velocities[i3] += (p_originalPositions[i3] - p_positions[i3]) * PARAMS.returnForce;
                p_velocities[i3 + 1] += (p_originalPositions[i3 + 1] - p_positions[i3 + 1]) * PARAMS.returnForce;
                
                // Gentle floating animation
                p_velocities[i3 + 2] += Math.sin(elapsedTime * 0.5 + p_originalPositions[i3]) * 0.0005;

                // Damping
                p_velocities[i3] *= PARAMS.damping;
                p_velocities[i3 + 1] *= PARAMS.damping;
                p_velocities[i3 + 2] *= PARAMS.damping;
                
                // Update position
                p_positions[i3] += p_velocities[i3];
                p_positions[i3 + 1] += p_velocities[i3 + 1];
                p_positions[i3 + 2] += p_velocities[i3 + 2];
            }
            points.geometry.attributes.position.needsUpdate = true;
            points.geometry.attributes.color.needsUpdate = true;
            
            // Update line positions using the robust connections array
            for (let i = 0; i < connections.length; i++) {
                const [p1_index, p2_index] = connections[i];
                const p1_pos_index = p1_index * 3;
                const p2_pos_index = p2_index * 3;
                const line_pos_index = i * 6;

                l_positions[line_pos_index] = p_positions[p1_pos_index];
                l_positions[line_pos_index + 1] = p_positions[p1_pos_index + 1];
                l_positions[line_pos_index + 2] = p_positions[p1_pos_index + 2];
                l_positions[line_pos_index + 3] = p_positions[p2_pos_index];
                l_positions[line_pos_index + 4] = p_positions[p2_pos_index + 1];
                l_positions[line_pos_index + 5] = p_positions[p2_pos_index + 2];
            }
            lines.geometry.attributes.position.needsUpdate = true;

            // Subtle scene rotation
            scene.rotation.y += 0.0002;
            scene.rotation.x += 0.0001;

            renderer.render(scene, camera);
        };

        init();

        return () => {
            window.removeEventListener('resize', onWindowResize);
            document.removeEventListener('mousemove', onPointerMove);
            document.removeEventListener('touchmove', onPointerMove);
            document.removeEventListener('mouseleave', onPointerLeave);
            document.removeEventListener('touchend', onPointerLeave);
            // Proper cleanup of Three.js resources could be added here if needed
        };
    }, []);

    return React.createElement('canvas', { id: 'bg-canvas', ref: canvasRef });
};


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
        React.createElement('h1', null, 'AI Foundations'),
        React.createElement('p', null, 'Bienvenue. Connectez-vous pour continuer.'),
        React.createElement('form', { onSubmit: (e: React.FormEvent) => e.preventDefault() },
            React.createElement('div', { className: 'form-group' },
                React.createElement('label', { htmlFor: 'email' }, 'Adresse e-mail'),
                React.createElement('input', { type: 'email', id: 'email', name: 'email', required: true, placeholder: 'nom@exemple.com' })
            ),
            React.createElement('div', { className: 'form-group' },
                React.createElement('label', { htmlFor: 'password' }, 'Mot de passe'),
                React.createElement('input', { type: 'password', id: 'password', name: 'password', required: true, placeholder: '••••••••' })
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
