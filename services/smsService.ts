import { MeliPayamakConfig } from '../types';

export const sendSms = async (
  to: string, 
  text: string, 
  eventType?: keyof NonNullable<MeliPayamakConfig['events']>,
  customConfig?: MeliPayamakConfig
): Promise<boolean> => {
  let config: MeliPayamakConfig | null = customConfig || null;
  if (!config) {
    try {
      const storedConfig = typeof localStorage !== 'undefined' ? localStorage.getItem('meliPayamakConfig') : null;
      if (storedConfig) {
        config = JSON.parse(storedConfig);
      }
    } catch (e) {
      console.warn('localStorage read for meliPayamakConfig failed:', e);
    }
  }

  if (!config) return false;

  try {
    if (!config.isEnabled || !config.username || !config.password || !config.senderNumber) {
      console.log('SMS sending is disabled or not fully configured.');
      return false;
    }

    if (eventType && config.events && config.events[eventType] === false) {
      console.log(`SMS sending for event ${eventType} is disabled.`);
      return false;
    }

    const data = new URLSearchParams();
    data.append('username', config.username);
    data.append('password', config.password);
    data.append('to', to);
    data.append('from', config.senderNumber);
    data.append('text', text);
    data.append('isflash', 'false');

    const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SendSMS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data.toString()
    });

    const result = await response.text();
    console.log('SMS Send Result:', result);
    return response.ok;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
};
