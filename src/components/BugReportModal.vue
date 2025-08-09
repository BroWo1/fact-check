/<template>
  <Transition name="modal" appear>
    <div v-if="visible" class="settings-modal-overlay" @click="handleOverlayClick">
      <div class="settings-modal" @click.stop>
        <div class="settings-modal-header">
          <h3 class="settings-modal-title">Report Bugs</h3>
          <button class="close-button" @click="closeModal">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12 4l-8 8m0-8l8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <div class="settings-modal-content">
          <p class="intro-text">
            Thanks for helping improve the site. Choose the option that fits your report.
          </p>

          <div class="contact-grid">
            <div class="contact-card">
              <div class="card-icon">💬</div>
              <div class="card-body">
                <div class="card-title">Common issues</div>
                <div class="card-desc">Since most of you already know me, just message me on WeChat.</div>
              </div>
            </div>

            <div class="contact-card">
              <div class="card-icon">🛡️</div>
              <div class="card-body">
                <div class="card-title">Critical security issues</div>
                <div class="card-desc">
                  Email <a href="mailto:will@gpeclub.com">will@gpeclub.com</a>
                </div>
                <div class="card-actions">
                  <button class="copy-button" @click="copyEmail" :disabled="copied">
                    <span v-if="!copied">Copy email</span>
                    <span v-else>Copied</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="details-box">
            <div class="details-title">Notice</div>
            <ul class="details-list">
              <li><span>For the obvious bugs, I probably already noticed them and just need some time to fix.</span></li>
              <li><span>For the less obvious issues, since they're likely rooted very deep, I may not have the skills to fix them.</span></li>
              <li><span>No WebKit specific issues, I hate WebKit.</span></li>
            </ul>
          </div>

          <p class="note-text">I hope there are actually people seeing this line of text</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const copied = ref(false)

const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

const closeModal = () => {
  emit('close')
}

const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText('will@gpeclub.com')
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch (_) {
    // no-op
  }
}
</script>

<style scoped>
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('../assets/fonts/LXGWNeoZhiSongPlus.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

/* Reuse settings modal classes for consistent animation and look */
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: overlayFadeIn 0.3s ease-out;
}

@keyframes overlayFadeIn {
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(8px); }
}

.modal-enter-active { transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1); }
.modal-leave-active { transition: all 0.2s cubic-bezier(0.755, 0.05, 0.855, 0.06); }
.modal-enter-from { opacity: 0; }
.modal-enter-to { opacity: 1; }
.modal-leave-from { opacity: 1; }
.modal-leave-to { opacity: 0; }

.modal-enter-from .settings-modal { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
.modal-enter-to .settings-modal { transform: translate(-50%, -50%) scale(1); opacity: 1; }
.modal-leave-from .settings-modal { transform: translate(-50%, -50%) scale(1); opacity: 1; }
.modal-leave-to .settings-modal { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }

.settings-modal {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}

.settings-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  background: #fafafa;
}

.settings-modal-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.close-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #999999;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.close-button:hover { background: rgba(0, 0, 0, 0.04); color: #000000; }

.settings-modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section { display: flex; flex-direction: column; gap: 16px; }
.section-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.intro-text {
  margin: 0;
  color: #4b5563;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.contact-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.contact-card:hover { background: #f3f4f6; border-color: #d1d5db; transform: translateY(-1px); }

.card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.card-body { flex: 1; }
.card-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #111827;
}
.card-desc {
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
  color: #4b5563;
}
.card-actions { margin-top: 10px; }

.copy-button {
  background: #000000;
  color: #ffffff;
  border: 1px solid #000000;
  border-radius: 8px;
  padding: 6px 10px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.copy-button:hover { background: #333333; border-color: #333333; transform: translateY(-1px); }
.copy-button:disabled { opacity: 0.7; cursor: default; transform: none; }

.details-box {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
}
.details-title {
  font-family: 'Playfair Display', 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}
.details-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.details-list li { color: #4b5563; font-size: 13px; }
.details-list li::marker { color: #9ca3af; }

.note-text {
  margin: 0;
  color: #6b7280;
  font-size: 12px;
  font-family: 'Crimson Text', 'LXGW Neo ZhiSong Plus', serif;
}

@media (max-width: 768px) {
  .settings-modal { width: 95vw; max-height: 85vh; }
  .settings-modal-content { padding: 16px; gap: 16px; }
  .contact-grid { grid-template-columns: 1fr; gap: 10px; }
}
</style>
