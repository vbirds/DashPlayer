import parseChapter from '@/common/utils/praser/chapter-parser';
import path from 'path';
import fs from 'fs';
import { ChapterParseResult } from '@/common/types/chapter-result';
import SrtUtil from '@/common/utils/SrtUtil';
import hash from 'object-hash';
import TimeUtil from '@/common/utils/TimeUtil';
import StrUtil from '@/common/utils/str-util';
import FileUtil from '@/backend/utils/FileUtil';
import { inject, injectable } from 'inversify';
import FfmpegService from '@/backend/services/FfmpegService';
import TYPES from '@/backend/ioc/types';
import SplitVideoService from '@/backend/services/SplitVideoService';


export interface VideoSplitResult {
    title: string,
    start: number,
    end: number,
}


@injectable()
class SplitVideoServiceImpl implements SplitVideoService {

    @inject(TYPES.FfmpegService)
    private ffmpegService: FfmpegService;

    public async previewSplit(str: string) {
        return parseChapter(str);
    }

    async split({
                    videoPath,
                    srtPath,
                    chapters
                }: {
        videoPath: string,
        srtPath: string | null,
        chapters: ChapterParseResult[]
    }) {
        const folderName = path.join(path.dirname(videoPath), path.basename(videoPath, path.extname(videoPath)));
        const splitedVideos: VideoSplitResult[] = await this.splitVideoPart2(videoPath, chapters, folderName);
        if (StrUtil.isBlank(srtPath) || !fs.existsSync(srtPath)) {
            return;
        }
        const content = await FileUtil.read(srtPath);
        if (content === null) {
            return;
        }
        const srt = SrtUtil.parseSrt(content);
        for (const srtItem of splitedVideos) {
            const lines = srt
                .filter(line => line.end >= srtItem.start && line.start <= srtItem.end)
                .map((line, index) => ({
                    index: index + 1,
                    start: Math.max(line.start - srtItem.start, 0),
                    end: line.end - srtItem.start,
                    contentEn: line.contentEn,
                    contentZh: line.contentZh
                }));
            const srtContent = SrtUtil.toNewSrt(lines);
            const fileName = srtItem.title.replace(path.extname(videoPath), '.srt');
            fs.writeFileSync(fileName, srtContent);
        }
        return folderName;
    }


    async split2({
                     videoPath,
                     srtPath,
                     chapters
                 }: {
        videoPath: string,
        srtPath: string | null,
        chapters: ChapterParseResult[]
    }) {
        const folderName = path.join(path.dirname(videoPath), path.basename(videoPath, path.extname(videoPath)));
        const splitedVideos = await this.splitVideoPart(videoPath, chapters, folderName);
        if (StrUtil.isBlank(srtPath) || !fs.existsSync(srtPath)) {
            return;
        }
        const srtSplit: {
            start: number,
            end: number,
            name: string,
            duration: number
        }[] = [];
        let offset = -0.2;
        for (const v of splitedVideos) {
            const duration = await this.ffmpegService.duration(v);
            // 同名srt
            srtSplit.push({
                start: offset,
                end: offset + duration,
                name: v.replace(path.extname(v), '.srt'),
                duration
            });
            offset += duration;
        }

        const content = await FileUtil.read(srtPath);
        if (content === null) {
            return;
        }
        const srt = SrtUtil.parseSrt(content);
        for (const srtItem of srtSplit) {
            const lines = srt
                .filter(line => line.end >= srtItem.start && line.start <= srtItem.end)
                .map((line, index) => ({
                    index: index + 1,
                    start: Math.max(line.start - srtItem.start, 0),
                    end: Math.min(line.end - srtItem.start, srtItem.duration),
                    contentEn: line.contentEn,
                    contentZh: line.contentZh
                }));
            const srtContent = SrtUtil.toNewSrt(lines);
            fs.writeFileSync(srtItem.name, srtContent);
        }
        return folderName;
    }

    private async splitVideoPart(videoPath: string, chapters: ChapterParseResult[], folderName: string) {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName, { recursive: true });
        }
        const tempFilePrefix = hash(videoPath);
        const cs = chapters.map(chapter => {
            return {
                name: chapter.title,
                time: TimeUtil.parseDuration(chapter.timestampStart),
                timeStr: chapter.timestampStart
            };
        });
        const outputFiles = await this.ffmpegService.splitVideoByTimes({
            inputFile: videoPath,
            times: cs.map(c => c.time).filter(t => t > 0),
            outputFolder: folderName,
            outputFilePrefix: tempFilePrefix
        });
        console.log('outputFiles', outputFiles);
        const splitedVideos: string[] = [];
        // 重命名
        for (let i = 0; i < outputFiles.length; i++) {
            const c = cs[i];
            const file = outputFiles[i];
            const newName = path.join(folderName, `${c.timeStr}-${c.name}${path.extname(file)}`.replaceAll(':', ''));
            fs.renameSync(file, newName);
            splitedVideos.push(newName);
        }
        return splitedVideos;
    }

    private async splitVideoPart2(videoPath: string, chapters: ChapterParseResult[], folderName: string) {
        if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName, { recursive: true });
        }
        const resultChapters: VideoSplitResult[] = [];
        for (const chapter of chapters) {
            const newName = path.join(folderName, `${chapter.timestampStart}-${chapter.title}${path.extname(videoPath)}`.replaceAll(':', ''));
            const startTime = await this.ffmpegService.keyFrameAt(videoPath, TimeUtil.parseDuration(chapter.timestampStart));
            await this.ffmpegService.splitVideo({
                inputFile: videoPath,
                startSecond: startTime,
                endSecond: TimeUtil.parseDuration(chapter.timestampEnd),
                outputFile: newName
            });
            resultChapters.push({
                ...chapter,
                title: newName,
                start: startTime,
                end: TimeUtil.parseDuration(chapter.timestampEnd)
            });
        }
        return resultChapters;
    }
}


export default SplitVideoServiceImpl;
