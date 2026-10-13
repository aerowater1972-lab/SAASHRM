import { BadRequestException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsEndpointService } from './teams-endpoint.service';
import { TeamsNotifyDto } from '../dto/teams-notify.dto';

describe('TeamsService (UAT TC-04)', () => {
  let service: TeamsService;
  let endpointService: jest.Mocked<TeamsEndpointService>;

  const endpoint = {
    id: 'ep-1',
    tenantId: 't-1',
    url: 'https://hr.webhook.office.com/webhookb2/abc',
    isActive: true,
  } as any;

  const delivery = {
    id: 'del-1',
    status: 'DELIVERED',
    attempts: 1,
    createdAt: new Date('2026-10-13T00:00:00Z'),
  };

  beforeEach(() => {
    endpointService = {
      getActiveEndpoint: jest.fn(),
      dispatchPayload: jest.fn().mockResolvedValue(delivery),
    } as any;
    service = new TeamsService(endpointService);
  });

  describe('sendMessage', () => {
    it('rejects when text is missing', async () => {
      await expect(service.sendMessage({ text: '' } as TeamsNotifyDto, 't-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(endpointService.getActiveEndpoint).not.toHaveBeenCalled();
    });

    it('rejects when the tenant has no Teams endpoint configured', async () => {
      endpointService.getActiveEndpoint.mockResolvedValue(null);
      await expect(
        service.sendMessage({ text: 'Hello Teams' }, 't-1'),
      ).rejects.toThrow('No Microsoft Teams endpoint configured for this tenant');
      expect(endpointService.dispatchPayload).not.toHaveBeenCalled();
    });

    it('dispatches an adaptive card payload and returns the delivery record', async () => {
      endpointService.getActiveEndpoint.mockResolvedValue(endpoint);

      const result = await service.sendMessage(
        { text: 'Payroll approved', title: 'Payroll', summary: 'Payroll summary', themeColor: '00767A' },
        't-1',
      );

      expect(endpointService.getActiveEndpoint).toHaveBeenCalledWith('t-1');
      expect(endpointService.dispatchPayload).toHaveBeenCalledTimes(1);

      const [usedEndpoint, payload] = endpointService.dispatchPayload.mock.calls[0];
      expect(usedEndpoint).toBe(endpoint);
      expect(payload.type).toBe('message');
      expect(payload.summary).toBe('Payroll summary');
      expect(payload.themeColor).toBe('00767A');
      expect(payload.attachments[0].contentType).toBe('application/vnd.microsoft.card.adaptive');
      const cardBody = payload.attachments[0].content.body;
      expect(cardBody[0]).toMatchObject({ type: 'TextBlock', text: 'Payroll' });
      expect(cardBody[1]).toMatchObject({ type: 'TextBlock', text: 'Payroll approved' });

      expect(result).toEqual({
        id: 'del-1',
        status: 'DELIVERED',
        attempts: 1,
        createdAt: delivery.createdAt,
      });
    });

    it('falls back to the text for the activity-feed summary', async () => {
      endpointService.getActiveEndpoint.mockResolvedValue(endpoint);

      await service.sendMessage({ text: 'Just the body' }, 't-1');

      const [, payload] = endpointService.dispatchPayload.mock.calls[0];
      expect(payload.summary).toBe('Just the body');
      expect(payload.attachments[0].content.body).toHaveLength(1);
    });
  });

  describe('buildCardPayload', () => {
    it('omits optional fields when not provided', () => {
      const payload = service.buildCardPayload({ text: 'plain' });
      expect(payload.themeColor).toBeUndefined();
      expect(payload.attachments[0].content.version).toBe('1.4');
    });
  });
});
