import Store from 'electron-store';
import { SettingKey, SettingKeyObj } from '../types/store_schema';
import { strBlank } from '../utils/Util';
import { mainWindow, settingWindow } from './main';

const store = new Store();

export const storeSet = (key: SettingKey, value: string | undefined | null): boolean => {
    if (strBlank(value)) {
        value = SettingKeyObj[key];
    }
    const oldValue = store.get(key, SettingKeyObj[key]);
    if (oldValue === value) {
        false;
    }
    store.set(key, value);
    return true;
};

export const storeGet = (key: SettingKey): string => {
    return store.get(key, SettingKeyObj[key]) as string;
}

