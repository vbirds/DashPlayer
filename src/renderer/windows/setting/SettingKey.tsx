import React, { cloneElement, ReactElement, useState } from 'react';
import 'tailwindcss/tailwind.css';
import {
    MdBuild,
    MdColorLens,
    MdKeyboard,
    MdOutlineGTranslate,
    MdStorage,
    MdTranslate,
} from 'react-icons/md';
import TenantSetting from './sub/TenantSetting';
import YouDaoSetting from './sub/YouDaoSetting';
import ShortcutSetting from './sub/ShortcutSetting';
import './SettingKey.css';
import StorageSetting from './sub/StorageSetting';
import CheckUpdate from './sub/CheckUpdate';
import TitleBar from '../../components/TitleBar/TitleBar';
import AppearanceSetting from './sub/AppearanceSetting';

type SettingType =
    | 'you-dao'
    | 'tenant'
    | 'shortcut'
    | 'storage'
    | 'update'
    | 'appearance';

export default function SettingKey() {
    const [settingType, setSettingType] = useState<SettingType>('shortcut');
    const ele = (name: string, key: SettingType, icon: ReactElement) => {
        const isCurrent = settingType === key;
        return (
            <ul
                onClick={() => setSettingType(key)}
                className={`flex justify-start items-center overflow-hidden h-14 py-1 px-5 rounded-lg gap-4
                            ${isCurrent ? 'bg-yellow-500' : ''}
                            `}
            >
                {cloneElement(icon, {
                    className: `w-6 h-6 ${
                        isCurrent ? 'fill-white' : 'fill-yellow-600'
                    }`,
                })}
                {name}
            </ul>
        );
    };

    return (
        <div className="w-full h-screen flex flex-col mx-auto overflow-hidden select-none bg-stone-200">
            <TitleBar
                maximizable={false}
                className="fixed top-0 left-0 w-full z-50"
                windowsButtonClassName="hover:bg-black/10 fill-black/50"
                autoHideOnMac={false}
                windowsHasSettings={false}
            />
            <div className="flex flex-row flex-1 h-0">
                <aside className="w-1/3 backdrop-blur-3xl pt-6">
                    <div className="sticky top-0 p-4 pt-6 w-full flex flex-col">
                        {ele('快捷键', 'shortcut', <MdKeyboard />)}
                        {ele('外观', 'appearance', <MdColorLens />)}
                        {ele('字幕翻译', 'tenant', <MdOutlineGTranslate />)}
                        {ele('查单词', 'you-dao', <MdTranslate />)}
                        {ele('存储', 'storage', <MdStorage />)}
                        {ele('版本更新', 'update', <MdBuild />)}
                    </div>
                </aside>
                <main
                    role="main"
                    className="flex flex-col w-0 flex-1 bg-stone-50 drop-shadow overflow-y-auto"
                >
                    <div className="h-8 w-full" />
                    <div className="h-0 flex-1">
                        {settingType === 'tenant' && <TenantSetting />}
                        {settingType === 'appearance' && <AppearanceSetting />}
                        {settingType === 'you-dao' && <YouDaoSetting />}
                        {settingType === 'shortcut' && <ShortcutSetting />}
                        {settingType === 'storage' && <StorageSetting />}
                        {settingType === 'update' && <CheckUpdate />}
                    </div>
                </main>
            </div>
        </div>
    );
}
