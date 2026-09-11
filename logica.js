// ============================================================
// 🎙️ LFM RADIO - Creada por Ronald Medina
// ============================================================

// ========== REPRODUCTOR ==========
const STREAM_URL = 'https://radios.yanapak.org/Medina%20Radio';
const STREAM_FALLBACK = 'https://radios.yanapak.org/Medina%20Radio.m3u';

const audio = document.getElementById('lfmPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeBtn = document.getElementById('volumeBtn');
const waveformCool = document.getElementById('waveformCool');

// Configurar audio
if (audio) {
    audio.src = STREAM_URL;
    audio.load();
    audio.volume = volumeSlider ? volumeSlider.value / 100 : 0.7;
    audio.crossOrigin = 'anonymous';
}

// Si falla la URL principal, usar fallback
if (audio) {
    audio.addEventListener('error', () => {
        console.log('⚠️ Fallback al .m3u');
        audio.src = STREAM_FALLBACK;
        audio.load();
    });
}

// Play/Pause
if (playPauseBtn && audio) {
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play()
                .then(() => console.log('🎵 Reproduciendo'))
                .catch(err => {
                    console.error('Error:', err);
                    alert('No se pudo reproducir. Verifica la conexión.');
                });
        } else {
            audio.pause();
            console.log('⏸️ Pausado');
        }
    });
}

audio.addEventListener('play', () => {
    playPauseBtn.textContent = '⏸';
    playPauseBtn.classList.add('playing');
    startWaveAnimation();
});

audio.addEventListener('pause', () => {
    playPauseBtn.textContent = '▶';
    playPauseBtn.classList.remove('playing');
    stopWaveAnimation();
});

// Volumen
if (volumeSlider && audio) {
    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value / 100;
    });
}

// Botón mute
if (volumeBtn && audio) {
    let previousVolume = 0.7;
    volumeBtn.addEventListener('click', () => {
        if (audio.volume > 0) {
            previousVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
            volumeBtn.textContent = '🔇';
        } else {
            audio.volume = previousVolume;
            volumeSlider.value = previousVolume * 100;
            volumeBtn.textContent = '🔊';
        }
    });
}

// Ondas animadas
let waveInterval;
const waveBars = document.querySelectorAll('.waveform-cool span');

function startWaveAnimation() {
    if (waveInterval) clearInterval(waveInterval);
    waveInterval = setInterval(() => {
        waveBars.forEach(bar => {
            const randomHeight = Math.floor(Math.random() * 40) + 8;
            bar.style.height = `${randomHeight}px`;
        });
    }, 120);
}

function stopWaveAnimation() {
    if (waveInterval) {
        clearInterval(waveInterval);
        waveInterval = null;
    }
    waveBars.forEach(bar => {
        bar.style.height = '8px';
    });
}

console.log('✅ Reproductor LFM Radio configurado');

// ============================================================
// FIREBASE
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyDHxvxILBO9zY42EcIDcBSTTTGkGXqK61k",
    authDomain: "lfm-radio-750cb.firebaseapp.com",
    databaseURL: "https://lfm-radio-750cb-default-rtdb.firebaseio.com",
    projectId: "lfm-radio-750cb",
    storageBucket: "lfm-radio-750cb.firebasestorage.app",
    messagingSenderId: "476508090552",
    appId: "1:476508090552:web:c5b343123ea472fcdf444d"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const messagesRef = database.ref('chat_mensajes');
const typingRef = database.ref('typing_status');

let currentUser = '';
let replyingTo = null;
let typingTimeout = null;

function getCurrentUser() {
    return document.getElementById('userName').value.trim() || 'Oyente';
}

// ========== TYPING INDICATOR ==========
typingRef.on('value', (snapshot) => {
    const typingData = snapshot.val();
    const container = document.getElementById('typingIndicatorContainer');
    if (!container) return;
    
    if (typingData) {
        const typingUsers = [];
        const now = Date.now();
        for (const [userId, data] of Object.entries(typingData)) {
            if (userId !== currentUser && data.isTyping && (now - data.timestamp) < 3000) {
                typingUsers.push(data.name);
            }
        }
        if (typingUsers.length > 0) {
            container.style.display = 'block';
            container.textContent = typingUsers.length === 1 
                ? `✍️ ${typingUsers[0]} está escribiendo...` 
                : `✍️ ${typingUsers.join(', ')} están escribiendo...`;
        } else {
            container.style.display = 'none';
        }
    } else {
        container.style.display = 'none';
    }
});

const chatInputEl = document.getElementById('chatInput');
if (chatInputEl) {
    chatInputEl.addEventListener('input', () => {
        const user = getCurrentUser();
        if (user && user !== 'Oyente') {
            typingRef.child(user).set({ name: user, isTyping: true, timestamp: Date.now() });
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => typingRef.child(user).remove(), 2000);
        }
    });
}

// ========== RECIBIR MENSAJES ==========
messagesRef.limitToLast(100).on('child_added', (snapshot) => {
    const message = snapshot.val();
    message.firebaseId = snapshot.key;
    displayMessage(message);
});

// ========== MOSTRAR MENSAJES ==========
function displayMessage(message) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const existing = container.querySelector(`[data-message-id="${message.firebaseId}"]`);
    if (existing) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    msgDiv.dataset.messageId = message.firebaseId;
    
    const timeStr = message.time || new Date(message.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    let contentHtml = '';
    
    if (message.replyTo) {
        contentHtml += `
            <div class="reply-badge" onclick="scrollToMessage('${message.replyTo}')">
                ↩️ Respondiendo a: ${escapeHtml(message.replyAuthor || '')}
            </div>
        `;
    }
    
    if (message.type === 'image' && message.imageBase64) {
        if (message.text && message.text !== '📷 Imagen compartida') {
            contentHtml += `<div class="message-content">${escapeHtml(message.text)}</div>`;
        }
        contentHtml += `
            <img src="${message.imageBase64}" class="image-message" onclick="showFullImage(this.src)" alt="Imagen">
        `;
    } else {
        contentHtml += `<div class="message-content">${escapeHtml(message.text)}</div>`;
    }
    
    let reactionsHtml = '';
    if (message.reactions) {
        const reactionCounts = {};
        Object.values(message.reactions).forEach(emoji => {
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
        });
        for (const [emoji, count] of Object.entries(reactionCounts)) {
            reactionsHtml += `
                <button class="reaction-btn" onclick="addReaction('${message.firebaseId}', '${emoji}')">
                    ${emoji} ${count}
                </button>
            `;
        }
    }
    
    msgDiv.innerHTML = `
        <div class="message-author" onclick="mentionUser('${escapeHtml(message.author)}')">${escapeHtml(message.author)}</div>
        ${contentHtml}
        <div class="message-reactions">
            ${reactionsHtml}
            <button class="reaction-btn" onclick="addReaction('${message.firebaseId}', '❤️')">❤️</button>
            <button class="reaction-btn" onclick="addReaction('${message.firebaseId}', '😂')">😂</button>
            <button class="reaction-btn" onclick="addReaction('${message.firebaseId}', '👍')">👍</button>
        </div>
        <div class="message-actions-bar">
            <button class="msg-action-btn" onclick="replyToMessage('${message.firebaseId}', '${escapeHtml(message.author)}')">↩️ Responder</button>
        </div>
        <div class="message-time">${timeStr}</div>
    `;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// ========== ESCAPAR HTML ==========
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

// ========== ENVIAR MENSAJES ==========
window.sendTextMessage = function() {
    const input = document.getElementById('chatInput');
    const userName = getCurrentUser();
    let text = input ? input.value.trim() : '';
    if (text === '') return;
    
    const messageData = {
        author: userName,
        text: text,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };
    
    if (replyingTo) {
        messageData.replyTo = replyingTo.messageId;
        messageData.replyAuthor = replyingTo.author;
        replyingTo = null;
        if (input) input.placeholder = 'Escribe tu mensaje...';
    }
    
    messagesRef.push(messageData);
    if (input) input.value = '';
};

const sendBtn = document.getElementById('sendBtn');
if (sendBtn) sendBtn.addEventListener('click', sendTextMessage);

if (chatInputEl) {
    chatInputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
    });
}

// ========== MENCIONAR ==========
window.mentionUser = function(username) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value += `@${username} `;
        input.focus();
    }
};

// ========== RESPONDER ==========
window.replyToMessage = function(messageId, author) {
    replyingTo = { messageId, author };
    const input = document.getElementById('chatInput');
    if (input) {
        input.placeholder = `Respondiendo a ${author}...`;
        input.focus();
    }
};

// ========== REACCIONAR ==========
window.addReaction = function(messageId, emoji) {
    const userName = getCurrentUser();
    database.ref(`chat_mensajes/${messageId}/reactions/${userName}`).set(emoji);
};

// ========== SCROLL ==========
window.scrollToMessage = function(messageId) {
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.border = '2px solid #ff6b6b';
        setTimeout(() => { element.style.border = 'none'; }, 2000);
    }
};

// ========== IMÁGENES CHAT ==========
const imageBtn = document.getElementById('imageBtn');
const imageInputFile = document.getElementById('imageInput');

function sendImage(file, caption = '') {
    const userName = getCurrentUser();
    const reader = new FileReader();
    reader.onload = function(e) {
        const messageData = {
            author: userName,
            text: caption || '📷 Imagen compartida',
            imageBase64: e.target.result,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            type: 'image'
        };
        if (replyingTo) {
            messageData.replyTo = replyingTo.messageId;
            messageData.replyAuthor = replyingTo.author;
            replyingTo = null;
            document.getElementById('chatInput').placeholder = 'Escribe tu mensaje...';
        }
        messagesRef.push(messageData);
    };
    reader.readAsDataURL(file);
}

window.showFullImage = function(src) {
    const overlay = document.createElement('div');
    overlay.className = 'image-fullscreen';
    overlay.innerHTML = `<img src="${src}" alt="Imagen completa">`;
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
};

if (imageBtn && imageInputFile) {
    imageBtn.addEventListener('click', () => imageInputFile.click());
    imageInputFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 2 * 1024 * 1024) {
                alert('La imagen es muy grande. Máximo 2MB.');
                imageInputFile.value = '';
                return;
            }
            const caption = prompt('Descripción de la imagen:', '');
            sendImage(file, caption);
        }
        imageInputFile.value = '';
    });
}

// ========== WHATSAPP ==========
const whatsappBtn = document.getElementById('whatsappBtn');
if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
        const mensaje = 
            '🎵 Hola, quiero dedicar una canción en LFM Radio 🎙️\n\n' +
            '🎶 Canción: \n' +
            '👤 Para: \n' +
            '💬 Mensaje: ';
        window.open('https://wa.me/573218384587?text=' + encodeURIComponent(mensaje), '_blank');
    });
}

// ========== CAMBIAR NOMBRE ==========
const userNameInput = document.getElementById('userName');
if (userNameInput) {
    userNameInput.addEventListener('change', () => { currentUser = getCurrentUser(); });
    userNameInput.addEventListener('input', () => { currentUser = getCurrentUser(); });
}

// ============================================================
// SECCIÓN DEDICATORIAS
// ============================================================
let dedSelectedImage = null;

const dedImageBtn = document.getElementById('dedImageBtn');
const dedImageInput = document.getElementById('dedImageInput');
const dedImagePreview = document.getElementById('dedImagePreview');
const sendDedicationBtn = document.getElementById('sendDedicationBtn');

if (dedImageBtn && dedImageInput) {
    dedImageBtn.addEventListener('click', () => dedImageInput.click());
    
    dedImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen es muy grande. Máximo 2MB.');
            dedImageInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            dedSelectedImage = event.target.result;
            dedImagePreview.innerHTML = `
                <img src="${dedSelectedImage}" alt="Vista previa">
                <button type="button" class="btn" style="margin-top:8px; font-size:0.8rem; padding:6px 12px;" onclick="removeDedImage()">❌ Quitar imagen</button>
            `;
        };
        reader.readAsDataURL(file);
    });
}

window.removeDedImage = function() {
    dedSelectedImage = null;
    dedImagePreview.innerHTML = '';
    if (dedImageInput) dedImageInput.value = '';
};

// Cola de dedicatorias (para que no se pisen)
const dedicationQueue = [];
let showingDedication = false;

function queueDedication(data) {
    dedicationQueue.push(data);
    processDedicationQueue();
}

function processDedicationQueue() {
    if (showingDedication) return;
    if (dedicationQueue.length === 0) return;
    
    showingDedication = true;
    const next = dedicationQueue.shift();
    
    showDedicationOverlay(next, () => {
        showingDedication = false;
        processDedicationQueue();
    });
}

// Enviar dedicatoria
if (sendDedicationBtn) {
    sendDedicationBtn.addEventListener('click', () => {
        const from = document.getElementById('dedFrom').value.trim();
        const to = document.getElementById('dedTo').value.trim();
        const song = document.getElementById('dedSong').value.trim();
        const message = document.getElementById('dedMessage').value.trim();
        
        // Validaciones (solo 2 obligatorios)
        if (!from) { alert('✍️ Escribe quién envía la dedicatoria'); return; }
        if (!to) { alert('💝 Escribe para quién es la dedicatoria'); return; }
        
        const dedicationData = {
            from: from,
            to: to,
            song: song || '🎵 Canción sorpresa',
            message: message || '¡Con mucho cariño!',
            image: dedSelectedImage || null,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
        
        // Guardar en Firebase → todos lo ven
        database.ref('dedicatorias').push(dedicationData);
        
        // Enviar por WhatsApp
        const whatsappMsg = 
            '🎵 DEDICATORIA PARA LFM RADIO 🎙️\n\n' +
            `👤 De: ${from}\n` +
            `💝 Para: ${to}\n\n` +
            `🎶 Canción: ${dedicationData.song}\n\n` +
            `💬 ${dedicationData.message}`;
        
        setTimeout(() => {
            window.open(
                'https://wa.me/573218384587?text=' + encodeURIComponent(whatsappMsg),
                '_blank'
            );
        }, 500);
        
        // Limpiar formulario
        document.getElementById('dedFrom').value = '';
        document.getElementById('dedTo').value = '';
        document.getElementById('dedSong').value = '';
        document.getElementById('dedMessage').value = '';
        removeDedImage();
    });
}

// Mostrar overlay 10 segundos
function showDedicationOverlay(data, onComplete) {
    const overlay = document.getElementById('dedicationOverlay');
    if (!overlay) return;
    
    document.getElementById('dedOverlayFrom').textContent = data.from;
    document.getElementById('dedOverlayTo').textContent = data.to;
    document.getElementById('dedOverlaySong').textContent = data.song;
    document.getElementById('dedOverlayMessage').textContent = data.message;
    
    const imgContainer = document.getElementById('dedOverlayImage');
    imgContainer.innerHTML = data.image 
        ? `<img src="${data.image}" alt="Dedicatoria">`
        : '';
    
    overlay.classList.add('active');
    
    const DURATION = 10;
    let remaining = DURATION;
    
    const progressBar = document.getElementById('dedProgressBar');
    const timerDisplay = document.getElementById('dedTimer');
    
    progressBar.style.width = '100%';
    timerDisplay.textContent = `${remaining}s`;
    
    const startTime = Date.now();
    
    const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        remaining = Math.max(0, DURATION - elapsed);
        
        const percent = (remaining / DURATION) * 100;
        progressBar.style.width = `${percent}%`;
        timerDisplay.textContent = `${Math.ceil(remaining)}s`;
        
        if (remaining <= 0) {
            clearInterval(interval);
            overlay.classList.remove('active');
            if (onComplete) onComplete();
        }
    }, 100);
    
    overlay.onclick = () => {
        clearInterval(interval);
        overlay.classList.remove('active');
        if (onComplete) onComplete();
    };
}

// Escuchar dedicatorias en Firebase (para que TODOS las vean)
const dedicationsRef = database.ref('dedicatorias');
dedicationsRef.limitToLast(1).on('child_added', (snapshot) => {
    const ded = snapshot.val();
    if (!ded || !ded.timestamp) return;
    
    // Solo mostrar si es reciente (últimos 60 segundos)
    const age = Date.now() - ded.timestamp;
    if (age > 60000 || age < -5000) return;
    
    // Evitar mostrarla dos veces
    if (window.lastDedicationShown === ded.timestamp) return;
    window.lastDedicationShown = ded.timestamp;
    
    queueDedication(ded);
});

// ============================================================
// MENSAJE DE BIENVENIDA
// ============================================================
setTimeout(() => {
    messagesRef.limitToLast(1).once('value', (snapshot) => {
        if (!snapshot.val()) {
            messagesRef.push({
                author: '🎧 LFM Radio',
                text: '🎉 ¡Bienvenidos! La radio está en vivo',
                timestamp: Date.now(),
                time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            });
        }
    });
}, 1000);

currentUser = getCurrentUser();

console.log('✅ LFM Radio inicializada correctamente');
console.log('🎙️ Creada por Ronald Medina');