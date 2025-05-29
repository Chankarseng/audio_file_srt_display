
const toSeconds = (timeString: string) => {
  const [h, m, s] = timeString.replace(',', '.').split(':').map(parseFloat);
  return h * 3600 + m * 60 + s;
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsPart = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secondsPart.toString().padStart(2, '0')}`;
}

export {
  toSeconds,
  formatTime
}
