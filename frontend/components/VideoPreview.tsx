'use client';

import {useEffect, useState} from 'react';
import {api} from './api';
import {Icon} from './Icon';

export function VideoPreview({recordingId, className}:{recordingId:string; className:string}) {
  const [thumbnail, setThumbnail] = useState('');

  useEffect(() => {
    let active = true;
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;
    video.src = `${api}/playback/${recordingId}/stream`;
    const capture = () => {
      if (!active || !video.videoWidth || !video.videoHeight) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbnail(canvas.toDataURL('image/jpeg', .82));
    };
    video.onloadeddata = capture;
    video.onerror = () => active && setThumbnail('');
    video.load();
    return () => { active = false; video.removeAttribute('src'); video.load(); };
  }, [recordingId]);

  return <div className={`${className} ${thumbnail ? 'has-video-preview' : ''}`} style={thumbnail ? {backgroundImage:`url(${thumbnail})`} : undefined}>
    <span className="preview-play"><Icon name="play" size={30}/></span>
  </div>;
}
