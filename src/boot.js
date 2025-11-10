(function(){
  if (window.FFmpegWASM && !window.FFmpeg) window.FFmpeg = window.FFmpegWASM;
  window.__FFMPEG_UMD_OK__ = !!(window.FFmpeg && window.FFmpeg.FFmpeg);
})();