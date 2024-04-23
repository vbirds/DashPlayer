import {ipcMain, shell} from 'electron';
import log from 'electron-log';
import axios from 'axios';
import {
    clearCache,
    openDataDir,
    queryCacheSize
} from './controllers/StorageController';
import {appVersion, checkUpdate} from './controllers/CheckUpdate';
import {WindowState} from '@/common/types/Types';
import {SettingKey} from '@/common/types/store_schema';
import {storeGet, storeSet} from './store';
import {Channels} from '@/preload';
import SubtitleTimestampAdjustmentController from '@/backend/controllers/SubtitleTimestampAdjustmentController';
import {
    InsertSubtitleTimestampAdjustment,
    SubtitleTimestampAdjustment
} from '@/backend/db/tables/subtitleTimestampAdjustment';
import fs from 'fs';
import Controller from "@/backend/interfaces/controller";
import AiFuncController from "@/backend/controllers/AiFuncController";
import SystemController from "@/backend/controllers/SystemController";
import DpTaskController from "@/backend/controllers/DpTaskController";
import AiTransController from "@/backend/controllers/AiTransController";
import WatchProjectController from '@/backend/controllers/WatchProjectController';
import SubtitleController from '@/backend/controllers/SubtitleProcesser';
import SplitVideoController from "@/backend/controllers/SplitVideoController";


const handle = (
    channel: Channels,
    listenerWrapper: (...args: any[]) => Promise<void> | any
): void => {
    ipcMain.handle(channel, (event, ...args) => {
        return listenerWrapper(...args);
    });
};

const controllers: Controller[] = [
    new AiFuncController(),
    new SystemController(),
    new DpTaskController(),
    new AiTransController(),
    new WatchProjectController(),
    new SubtitleController(),
    new SplitVideoController(),
]

export default function registerHandler(mainWindowRef: { current: Electron.CrossProcessExports.BrowserWindow }) {
    ipcMain.on('update-process', async (event, arg) => {
        log.info('ipcMain update-process', arg);
        event.reply('update-process', 'success');
    });
    handle(
        'store-set',
        async (key: SettingKey, value: string | undefined | null) => {
            if (storeSet(key, value)) {
                mainWindowRef.current?.webContents.send('store-update', key, value);
            }
        }
    );
    handle('store-get', async (key: SettingKey) => {
        return storeGet(key);
    });
    handle('words-translate', async (words: string[]) => {
        log.info('words-translate');
    });
    handle('get-audio', async (url) => {
        log.info('get-audio', url);
        const response = await axios.get(url, {responseType: 'arraybuffer'});
        return response.data;
    });
    handle('show-button', async () => {
        log.info('show-button');
        // 展示红绿灯
        if (process.platform === 'darwin') {
            mainWindowRef.current?.setWindowButtonVisibility(true);
        }
    });
    handle('hide-button', async () => {
        log.info('hide-button');
        // 隐藏红绿灯
        if (process.platform === 'darwin') {
            mainWindowRef.current?.setWindowButtonVisibility(false);
        }
    });

    handle('open-data-dir', async () => {
        log.info('open-data-dir');
        await openDataDir();
    });
    handle('query-cache-size', async () => {
        log.info('query-cache-size');
        return queryCacheSize();
    });
    handle('clear-cache', async () => {
        log.info('clear-cache');
        await clearCache();
    });
    handle('check-update', async () => {
        log.info('check-update');
        return checkUpdate();
    });
    handle('app-version', async () => {
        log.info('app-version');
        return appVersion();
    });
    handle('open-url', async (url: string) => {
        log.info('open-url', url);
        await shell.openExternal(url);
    });
    handle('player-size', async () => {
        log.info('player-size');
        mainWindowRef.current?.setResizable(true);
        mainWindowRef.current?.setMaximizable(true);
        mainWindowRef.current?.maximize();
    });
    handle('main-state', async (state: WindowState) => {
        switch (state) {
            case 'normal':
                mainWindowRef.current?.unmaximize();
                mainWindowRef.current?.setFullScreen(false);
                break;
            case 'maximized':
                mainWindowRef.current?.maximize();
                break;
            case 'minimized':
                mainWindowRef.current?.minimize();
                break;
            case 'fullscreen':
                mainWindowRef.current?.setFullScreen(true);
                break;
            case 'closed':
                mainWindowRef.current?.close();
                break;
            default:
                break;
        }
    });
    handle('home-size', async () => {
        log.info('home-size');
        mainWindowRef.current?.unmaximize();
        mainWindowRef.current?.setSize(1200, 800);
        mainWindowRef.current?.setResizable(true);
        mainWindowRef.current?.setMaximizable(false);
    });
    handle('open-file', async (path: string) => {
        log.info('open-file', path);
        // 如果文件存在, 则返回文件流, 否则返回null
        // 检查文件是否存在
        if (!fs.existsSync(path)) {
            log.info('open-file', '文件不存在');
            return null;
        }

        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                }
                resolve(Buffer.from(data));
            });
        });
    });
    handle('select-file', async (isFolder: boolean) => {
        // return WatchProjectService.selectFiles(isFolder);
    });
    handle(
        'subtitle-timestamp-record',
        async (e: InsertSubtitleTimestampAdjustment) => {
            await SubtitleTimestampAdjustmentController.record(e);
        }
    );
    handle('subtitle-timestamp-delete-key', async (key: string) => {
        await SubtitleTimestampAdjustmentController.deleteByKey(key);
    });
    handle('subtitle-timestamp-delete-path', async (subtitlePath: string) => {
        await SubtitleTimestampAdjustmentController.deleteByPath(subtitlePath);
    });
    handle('subtitle-timestamp-get-key', async (key: string) => {
        return SubtitleTimestampAdjustmentController.getByKey(key);
    });

    handle(
        'subtitle-timestamp-get-path',
        async (
            subtitlePath: string
        ): Promise<SubtitleTimestampAdjustment[]> => {
            return SubtitleTimestampAdjustmentController.getByPath(
                subtitlePath
            );
        }
    );
    controllers.forEach((controller) => {
        controller.registerRoutes();
    });
}
