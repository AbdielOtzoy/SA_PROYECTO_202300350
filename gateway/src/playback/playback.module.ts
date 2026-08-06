import { Module } from '@nestjs/common';
import { HistoryController, PlaybackController } from './playback.controller';
import { PlaybackService } from './playback.service';
import { CommonModule } from '../common/common.module';

@Module({ imports: [CommonModule], controllers: [PlaybackController, HistoryController], providers: [PlaybackService] })
export class PlaybackModule {}
