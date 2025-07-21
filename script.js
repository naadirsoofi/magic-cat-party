// Magic Cat Party Game JavaScript

class MagicCatParty {
    constructor() {
        this.confettiCanvas = document.getElementById('confettiCanvas');
        this.ctx = this.confettiCanvas.getContext('2d');
        this.confettiParticles = [];
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.musicToggle = document.getElementById('musicToggle');
        this.catDisplay = document.getElementById('catDisplay');
        this.backgroundAnimations = document.getElementById('backgroundAnimations');
        
        this.init();
        this.setupEventListeners();
        this.startBackgroundAnimations();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Set up background music
        this.backgroundMusic.volume = 0.3;
        this.musicToggle.addEventListener('click', () => this.toggleMusic());
        
        // Initialize background music (user interaction required)
        document.addEventListener('click', () => {
            if (this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
            }
        }, { once: true });
    }

    resizeCanvas() {
        this.confettiCanvas.width = window.innerWidth;
        this.confettiCanvas.height = window.innerHeight;
    }

    setupEventListeners() {
        const gameButtons = document.querySelectorAll('.game-btn');
        gameButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleButtonClick(action, e.currentTarget);
            });
        });
    }

    handleButtonClick(action, buttonElement) {
        // Prevent multiple rapid clicks
        if (buttonElement.classList.contains('btn-pressed')) {
            return;
        }

        // Add pressed animation
        buttonElement.classList.add('btn-pressed');
        setTimeout(() => {
            buttonElement.classList.remove('btn-pressed');
        }, 600);

        // Execute action based on button type
        switch(action) {
            case 'meow':
                this.meowAction();
                break;
            case 'party':
                this.partyAction();
                break;
            case 'rainbow':
                this.rainbowAction();
                break;
            case 'balloons':
                this.balloonsAction();
                break;
            case 'cupcake':
                this.cupcakeAction();
                break;
            case 'rocket':
                this.rocketAction();
                break;
            case 'secret':
                this.secretAction();
                break;
        }
    }

    meowAction() {
        this.playSound('meowSound');
        this.showCatGif();
        this.createSimpleSparkles(6);
    }

    partyAction() {
        this.playSound('cheerSound');
        this.startConfetti();
        this.showCatGif();
    }

    rainbowAction() {
        this.playSound('magicSound');
        
        // Prevent multiple rainbow effects running at once
        if (document.body.classList.contains('rainbow-bg')) {
            return;
        }
        
        document.body.classList.add('rainbow-bg');
        this.createSimpleSparkles(8);
        
        setTimeout(() => {
            document.body.classList.remove('rainbow-bg');
        }, 2500);
    }

    balloonsAction() {
        this.playSound('popSound');
        this.createBalloons();
        this.createSimpleSparkles(5);
    }

    cupcakeAction() {
        this.playSound('boingSound');
        this.showCatGif();
        this.createSimpleSparkles(8);
    }

    rocketAction() {
        this.playSound('whooshSound');
        this.createRocket();
        this.startConfetti();
    }

    secretAction() {
        this.playSound('magicSound');
        this.transformAllButtonsToCats();
        this.startConfetti();
        this.createSimpleSparkles(12);
    }

    playSound(soundId) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    showCatGif() {
        // Use simple emoji cats instead of external GIFs to avoid loading issues
        const catEmojis = ['🐱', '😸', '😺', '🙀', '😻', '😿', '😾', '🐈', '🐈‍⬛'];
        const randomCat = catEmojis[Math.floor(Math.random() * catEmojis.length)];
        
        const catDiv = document.createElement('div');
        catDiv.innerHTML = randomCat;
        catDiv.className = 'cat-gif';
        catDiv.style.fontSize = '8rem';
        catDiv.style.textAlign = 'center';
        catDiv.style.lineHeight = '200px';

        // Clear any existing cat display
        this.catDisplay.innerHTML = '';
        this.catDisplay.appendChild(catDiv);

        setTimeout(() => {
            this.catDisplay.innerHTML = '';
        }, 2000);
    }

    startConfetti() {
        // Prevent too many confetti particles
        if (this.confettiParticles.length > 30) {
            return;
        }
        
        for (let i = 0; i < 25; i++) {
            this.confettiParticles.push(this.createConfettiParticle());
        }
        this.animateConfetti();
    }

    createConfettiParticle() {
        return {
            x: Math.random() * this.confettiCanvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            color: this.getRandomColor(),
            size: Math.random() * 8 + 3,
            gravity: 0.1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        };
    }

    animateConfetti() {
        this.ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

        this.confettiParticles.forEach((particle, index) => {
            particle.vy += particle.gravity;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;

            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation * Math.PI / 180);
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
            this.ctx.restore();

            if (particle.y > this.confettiCanvas.height) {
                this.confettiParticles.splice(index, 1);
            }
        });

        if (this.confettiParticles.length > 0) {
            requestAnimationFrame(() => this.animateConfetti());
        }
    }

    createSimpleSparkles(count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.innerHTML = '✨';
                sparkle.style.position = 'fixed';
                sparkle.style.fontSize = '1.5rem';
                sparkle.style.left = Math.random() * (window.innerWidth - 50) + 'px';
                sparkle.style.top = Math.random() * (window.innerHeight - 50) + 'px';
                sparkle.style.animation = 'sparkleAnimation 1.5s ease-out forwards';
                sparkle.style.pointerEvents = 'none';
                sparkle.style.zIndex = '200';
                document.body.appendChild(sparkle);

                setTimeout(() => {
                    if (document.body.contains(sparkle)) {
                        document.body.removeChild(sparkle);
                    }
                }, 1500);
            }, i * 100);
        }
    }

    createRainbowSparkles() {
        const colors = ['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff'];
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle';
                sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
                sparkle.style.left = Math.random() * window.innerWidth + 'px';
                sparkle.style.top = Math.random() * window.innerHeight + 'px';
                document.body.appendChild(sparkle);

                setTimeout(() => {
                    document.body.removeChild(sparkle);
                }, 1000);
            }, i * 50);
        }
    }

    createCupcakeSparkles() {
        const cupcakeColors = ['#ffb3d1', '#fff176', '#ce93d8', '#ffab91'];
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle';
                sparkle.style.background = cupcakeColors[Math.floor(Math.random() * cupcakeColors.length)];
                sparkle.style.left = Math.random() * window.innerWidth + 'px';
                sparkle.style.top = Math.random() * window.innerHeight + 'px';
                sparkle.style.borderRadius = '50%';
                sparkle.style.width = '8px';
                sparkle.style.height = '8px';
                document.body.appendChild(sparkle);

                setTimeout(() => {
                    document.body.removeChild(sparkle);
                }, 1000);
            }, i * 80);
        }
    }

    createMagicSparkles() {
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.innerHTML = '✨';
                sparkle.style.position = 'absolute';
                sparkle.style.fontSize = '2rem';
                sparkle.style.left = Math.random() * window.innerWidth + 'px';
                sparkle.style.top = Math.random() * window.innerHeight + 'px';
                sparkle.style.animation = 'sparkleAnimation 2s ease-out forwards';
                sparkle.style.pointerEvents = 'none';
                document.body.appendChild(sparkle);

                setTimeout(() => {
                    document.body.removeChild(sparkle);
                }, 2000);
            }, i * 60);
        }
    }

    createBalloons() {
        const balloonEmojis = ['🎈', '🎀', '💖', '�'];
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const balloon = document.createElement('div');
                balloon.className = 'balloon';
                balloon.innerHTML = balloonEmojis[Math.floor(Math.random() * balloonEmojis.length)];
                balloon.style.left = Math.random() * (window.innerWidth - 50) + 'px';
                document.body.appendChild(balloon);

                setTimeout(() => {
                    if (document.body.contains(balloon)) {
                        document.body.removeChild(balloon);
                    }
                }, 3000);
            }, i * 150);
        }
    }

    createRocket() {
        const rocket = document.createElement('div');
        rocket.innerHTML = '🚀';
        rocket.style.position = 'absolute';
        rocket.style.fontSize = '4rem';
        rocket.style.left = '50%';
        rocket.style.top = '100vh';
        rocket.style.transform = 'translateX(-50%)';
        rocket.style.animation = 'balloonFloat 2s ease-out forwards';
        rocket.style.pointerEvents = 'none';
        document.body.appendChild(rocket);

        setTimeout(() => {
            document.body.removeChild(rocket);
        }, 2000);
    }

    transformAllButtonsToCats() {
        const buttons = document.querySelectorAll('.game-btn');
        buttons.forEach((button, index) => {
            setTimeout(() => {
                const icon = button.querySelector('.btn-icon');
                const originalIcon = icon.innerHTML;
                
                button.classList.add('cat-transformed');
                icon.innerHTML = '🐱';
                
                setTimeout(() => {
                    icon.innerHTML = originalIcon;
                    button.classList.remove('cat-transformed');
                }, 3000);
            }, index * 200);
        });
    }

    startBackgroundAnimations() {
        const floatingElements = ['🐱', '🎉', '🌟', '💖'];
        
        setInterval(() => {
            if (Math.random() > 0.8) { // 20% chance every 2 seconds
                const element = document.createElement('div');
                element.className = 'floating-element';
                element.innerHTML = floatingElements[Math.floor(Math.random() * floatingElements.length)];
                element.style.left = Math.random() * window.innerWidth + 'px';
                element.style.top = Math.random() * window.innerHeight + 'px';
                element.style.animationDelay = Math.random() * 2 + 's';
                
                this.backgroundAnimations.appendChild(element);
                
                setTimeout(() => {
                    if (this.backgroundAnimations.contains(element)) {
                        this.backgroundAnimations.removeChild(element);
                    }
                }, 6000);
            }
        }, 2000);
    }

    getRandomColor() {
        const colors = ['#ff6b9d', '#ffd93d', '#6bcf7f', '#42a5f5', '#ab47bc', '#ff7043', '#26c6da'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    toggleMusic() {
        if (this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
            this.musicToggle.textContent = '🎵';
            this.musicToggle.classList.remove('muted');
        } else {
            this.backgroundMusic.pause();
            this.musicToggle.textContent = '🔇';
            this.musicToggle.classList.add('muted');
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MagicCatParty();
});
