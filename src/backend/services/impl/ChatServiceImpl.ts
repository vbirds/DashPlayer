import { DpTaskState } from '@/backend/db/tables/dpTask';
import RateLimiter from '@/common/utils/RateLimiter';
import { BaseMessage } from '@langchain/core/messages';
import { inject, injectable } from 'inversify';
import DpTaskService from '@/backend/services/DpTaskService';
import TYPES from '@/backend/ioc/types';
import ChatService from '@/backend/services/ChatService';
import AiProviderService from '@/backend/services/AiProviderService';


@injectable()
export default class ChatServiceImpl implements ChatService {

    @inject(TYPES.DpTaskService)
    private dpTaskService: DpTaskService;

    @inject(TYPES.AiProviderService)
    private aiProviderService: AiProviderService;


    public async chat(taskId: number, msgs: BaseMessage[]) {
        await RateLimiter.wait('gpt');
        const chat = await this.aiProviderService.getOpenAi();
        if (chat) {
            this.dpTaskService.update({
                id: taskId,
                status: DpTaskState.FAILED,
                progress: 'OpenAI api key or endpoint is empty'
            });
        }
        this.dpTaskService.update({
            id: taskId,
            status: DpTaskState.IN_PROGRESS,
            progress: 'AI is thinking...'
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const resStream = await chat.stream(msgs);
        const chunks = [];
        let res = '';
        for await (const chunk of resStream) {
            res += chunk.content;
            chunks.push(chunk);
            this.dpTaskService.update({
                id: taskId,
                status: DpTaskState.IN_PROGRESS,
                progress: `AI typing, ${res.length} characters`,
                result: res
            });
        }
        this.dpTaskService.update({
            id: taskId,
            status: DpTaskState.DONE,
            progress: 'AI has responded',
            result: res
        });
    }
}

