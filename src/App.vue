<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';
import { useDraggable } from '@vueuse/core'

type Subtitle = {
  start: number;
  end: number;
  text: string;
};

type SubtitleList = (Subtitle | undefined)[];

const audioRef = ref<HTMLAudioElement | null>(null);
const subtitleRef = useTemplateRef<HTMLElement>('subtitleRef');
const currentSubtitle = ref('');
const playState = ref(false);
const currentProgress = ref('0')
const cues = ref<SubtitleList>([]);
const audioSrc = ref<string>("");
const audioFileName = ref<string>("");
const srtFileName = ref<string>("");
const manualSeekTime = ref<string>('');
const isInvalid = ref(false);

const { style } = useDraggable(subtitleRef, {
  //@ts-expect-error: x position not initially passed in, as the position of the subtitle to be
  //center via flex box
  initialValue: { y: window.innerHeight - 200 },
})

function parseSubtitles(srtText: string) {
  const blocks = srtText.trim().split(/\n\s*\n/);
  const subtitles: SubtitleList = blocks.map(block => {
    const lines = block.split("\n");
    if (lines.length >= 3) {
      const time = lines[1].split(" --> ");
      return {
        start: toSeconds(time[0]),
        end: toSeconds(time[1]),
        text: lines.slice(2).join(" ")  // Combine multiline subtitles
      };
    }
  }).filter(Boolean);
  return subtitles
}

function toSeconds(timeString: string) {
  const [h, m, s] = timeString.replace(',', '.').split(':').map(parseFloat);
  return h * 3600 + m * 60 + s;
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsPart = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secondsPart.toString().padStart(2, '0')}`;
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
      currentSubtitle.value = cue ? cue.text : '';
    });
  }
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
}

const handleManualSeekInput = () => {
  isInvalid.value = false
}

const handleManualSeek = (event: Event) => {
  event.preventDefault();
  const timeString = manualSeekTime.value;
  console.log(timeString)
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
  //audioRef.value.src = URL.createObjectURL(file);
}

const handleSrtFileInput = (event: Event) => {
  const inputElement = event.target as HTMLInputElement;
  const file = inputElement.files?.[0];
  if (!file) return
  loadSubtitles(URL.createObjectURL(file))
  srtFileName.value = file.name;
}
const handleAudioEnded = (event: Event) => {
  if (audioRef.value) {
    const audio = audioRef.value;
    audio.currentTime = 0;
    audio.pause();
    playState.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1>Mp3 audio file and SRT debugger</h1>
    <audio ref="audioRef" :src="audioSrc" @ended="handleAudioEnded"></audio>
    <button :disabled="!audioSrc" @click="togglePlay">{{ playState ? 'Pause' : 'Play' }}</button>
    <div class="input-container">
      <div>
        <input type="file" accept="audio/*" class="audio-input" id="audio-input" @change="handleAudioFileInput" />
        <label class="audio-input-label" for="audio-input">Load MP3 file</label>
        <div v-if="audioFileName">{{ audioFileName }}</div>
      </div>
      <div>
        <input type="file" accept=".srt" class="srt-input" id="srt-input" @change="handleSrtFileInput" />
        <label class="audio-input-label" for="srt-input">Load SRT file</label>
        <div v-if="srtFileName">{{ srtFileName }}</div>
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
    <div ref="subtitleRef" class="subtitle" :style="[style, { 'display': currentSubtitle ? 'block' : 'none' }]">{{
      currentSubtitle }}</div>

  </div>
</template>

<style scoped>
.container {
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 20px
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

.subtitle {
  position: absolute;
  margin-top: 10px;
  font-size: 1.2em;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  display: inline-block;
  min-height: 2rem;
  cursor: grab;
}

.audio-input,
.srt-input {
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}

.audio-input-label {
  cursor: pointer;
  background: #0077ff;
  padding: 10px;
  border-radius: 10px;
  color: #fff;
  font-size: 1.2em;
}

.input-container {
  display: flex;
  flex-direction: row;
  gap: 10px
}
</style>
