<script setup lang="ts">
import { onMounted, ref, useTemplateRef, onUnmounted } from 'vue';
import { useScroll, useElementVisibility } from '@vueuse/core';
import { toSeconds, formatTime } from '~/utils/time.ts'
import Subtitles from '@/components/subtitle/SubTitles.vue';
import UploadInput from '@/components/UploadInput.vue';

type Subtitle = {
  start: number;
  end: number;
  text: string[];
};

type SubtitleList = (Subtitle | undefined)[];

const appTitle = 'Subtitle Debugger';
const audioRef = ref<HTMLAudioElement | null>(null);
const subtitleOverflowRef = useTemplateRef<HTMLElement>('subtitleOverflowRef');
const { isScrolling } = useScroll(subtitleOverflowRef);
const activeRef = ref(null);
const isVisible = useElementVisibility(activeRef);
const currentSubtitle = ref<string[]>([]);
const playState = ref(false);
const currentProgress = ref('0')
const cues = ref<SubtitleList>([]);
const audioSrc = ref<string>("");
const audioFileName = ref<string>("");
const srtFileName = ref<string>("");
const manualSeekTime = ref<string>('');
const isInvalid = ref(false);
const activeSubtitleIndex = ref(0);


function parseSubtitles(srtText: string) {
  const blocks = srtText.trim().split(/\n\s*\n/);
  const subtitles: SubtitleList = blocks.map(block => {
    const lines = block.split("\n");
    if (lines.length >= 3) {
      const time = lines[1].split(" --> ");
      return {
        id: lines[0],
        start: toSeconds(time[0]),
        end: toSeconds(time[1]),
        text: lines.slice(2)  // Combine multiline subtitles
      };
    }
  }).filter(Boolean);
  return subtitles
}


const loadSubtitles = async (srtFile: string) => {
  const res = await fetch(srtFile);
  const text = await res.text();
  cues.value = parseSubtitles(text);

}
onMounted(async () => {
  if (audioRef.value) {
    const audio = audioRef.value;
    audioRef.value.addEventListener('timeupdate', () => {
      const time = audio.currentTime;
      const duration = audio.duration;
      const cue = cues.value.filter((cue) => cue !== undefined).find(cue => time >= cue.start && time <= cue.end);
      currentProgress.value = `${(time / duration) * 1000}`;
      currentSubtitle.value = cue ? cue.text : [];
      activeSubtitleIndex.value = cue ? cues.value.indexOf(cue) : activeSubtitleIndex.value;

      if (playState.value && !isScrolling.value && isVisible.value) {
        centerizeSubtitle()
      }
    });
  }
  document.addEventListener('keydown', handleKeyDown);
});

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    event.preventDefault(); // Prevent default spacebar behavior (scrolling)
    togglePlay();
  }
};

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  audioRef.value?.removeEventListener('timeupdate', () => { });
});

const togglePlay = () => {
  if (audioRef.value) {
    playState.value = !playState.value;
    if (playState.value) {
      audioRef.value.play();
    } else {
      audioRef.value.pause();
    }
  }
}

const seek = (event: Event) => {
  if (!audioRef.value) return
  const progress = (event.target as HTMLInputElement).value;
  const duration = audioRef.value.duration;
  const time = (Number(progress) / 1000) * duration;
  audioRef.value.currentTime = time;
  centerizeSubtitle();
}


const handleManualSeekInput = () => {
  isInvalid.value = false
}

const handleManualSeek = (event: Event) => {
  event.preventDefault();
  const timeString = manualSeekTime.value;
  if (!audioRef.value) return
  const timeRegex = /^(\d{2}):(\d{2}):(\d{2})$/g;
  if (timeString.match(timeRegex)) {
    const hour = Number(timeString.split(':')[0]);
    const minutes = Number(timeString.split(':')[1]);
    const seconds = Number(timeString.split(':')[2]);
    if (hour > 23 || minutes > 59 || seconds > 59) {
      isInvalid.value = true;
      return;
    }
    const time = hour * 3600 + minutes * 60 + seconds;
    audioRef.value.currentTime = time;
  }
  else {
    console.log("not valid :(")
    isInvalid.value = true;
  }
}

const handleAudioFileInput = (event: Event) => {
  const inputElement = event.target as HTMLInputElement;
  const file = inputElement.files?.[0];
  if (!file) return
  audioFileName.value = file.name;
  audioSrc.value = URL.createObjectURL(file)
}

const handleSrtFileInput = (event: Event) => {
  const inputElement = event.target as HTMLInputElement;
  const file = inputElement.files?.[0];
  if (!file) return
  loadSubtitles(URL.createObjectURL(file))
  srtFileName.value = file.name;
}

const handleAudioEnded = () => {
  if (audioRef.value) {
    const audio = audioRef.value;
    audio.currentTime = 0;
    audio.pause();
    playState.value = false
  }
}

const centerizeSubtitle = () => {
  const activeSubtitle = document.getElementsByClassName('active-subtitle')[0]
  if (activeSubtitle) {
    activeSubtitle.scrollIntoView({
      behavior: 'smooth',
      block: 'center',

    })
  }
}
const seekSubtitle = async (subtitle: Subtitle) => {
  const index = cues.value.indexOf(subtitle);
  if (audioRef.value) {
    audioRef.value.currentTime = subtitle.start;
    const setSubtitlePromise = new Promise((resolve) => {
      activeSubtitleIndex.value = index;
      resolve(true)
    })
    await setSubtitlePromise;
    centerizeSubtitle();
  }
}
const setActiveRef = (el: HTMLElement) => {
  activeRef.value = el;
}
</script>

<template>
  <div class="container">
    <div class="sub-container">
      <h1>{{ appTitle }}</h1>
      <audio ref="audioRef" :src="audioSrc" @ended="handleAudioEnded"></audio>
      <button class="pi-play" :disabled="!audioSrc" @click="togglePlay">{{ playState ? 'Pause' : 'Play'
        }}</button>
      <div class="input-container">
        <div>
          <UploadInput :fileName="audioFileName" id="audioFile" @handleFileUpload="handleAudioFileInput"
            buttonText="Load Mp3 File" accept="audio/*" />
        </div>
        <div>
          <UploadInput :fileName="srtFileName" id="srtFile" @handleFileUpload="handleSrtFileInput"
            buttonText="Load SRT file" accept=".srt" />
        </div>
      </div>
      <div class="seek-bar-container">
        <span>{{ audioRef?.currentTime ? formatTime(audioRef.currentTime) : '00:00:00' }}</span>
        <input :disabled="!audioSrc" class="progress-bar" type="range" min="0" max="1000" @input="seek"
          :value="currentProgress" />
        <span>{{ audioRef?.duration ? formatTime(audioRef.duration) : '00:00:00' }}</span>
      </div>
      <div>
        <label>Manual seek</label>
        <form @submit="handleManualSeek">
          <fieldset role="group">
            <input v-model="manualSeekTime" name="seekTime" type="text" placeholder="00:00:00"
              v-bind="isInvalid ? { 'aria-invalid': true } : {}" @input="handleManualSeekInput" />
            <input type="submit" value="Seek" />
          </fieldset>
        </form>
      </div>
      <Subtitles :currentSubtitle="currentSubtitle" />
    </div>
    <div class="sub-container overflow-subtitle-container" ref="subtitleOverflowRef">
      <div class="overflow-subtitle" v-for="(subtitle, index) in cues" :key="subtitle" @click="seekSubtitle(subtitle)"
        :ref="index === activeSubtitleIndex ? setActiveRef : null">
        <p :class="{ 'active-subtitle': index == activeSubtitleIndex }" v-for="text in subtitle.text" :key="text"> {{
          text }}</p>
      </div>
      <transition name="fade">
        <button v-show="!isVisible" class="center-button" @click="centerizeSubtitle">center</button>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  max-width: 100%;
  gap: 10px;
  height: 100%;
}

p {
  color: inherit;
}

.center-button {
  position: absolute;
  bottom: 10%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.active-subtitle {
  color: #fff;
  transition: ease 0.1s all;
}

.overflow-subtitle {
  font-size: 2rem;
  transition: ease 0.1s all;
  cursor: pointer;
  color: #777;
}

.overflow-subtitle:hover {
  color: #fff;
}

.sub-container {
  padding: 2rem;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 20px;
  background: #222;
}

.overflow-subtitle-container {
  height: 100%;
  overflow-y: scroll;
  justify-content: flex-start;
}

.seek-bar-container {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #333;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: unset;
}


.current-progress {
  width: v-bind(currentProgress);
  height: 100%;
  background: #0077ff;
  border-radius: 10px;
}

.input-container {
  display: flex;
  flex-direction: row;
  gap: 10px
}
</style>
