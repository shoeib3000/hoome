import type { WizardStep } from './types';

export const WIZARD_STEPS: { id: WizardStep; title: string; stepNumber: number; icon: string }[] = [
  { id: 'details', title: 'مشخصات، دسته‌بندی و قیمت', stepNumber: 1, icon: '🏢' },
  { id: 'media_contact', title: 'تصاویر، متن هوشمند و ثبت', stepNumber: 2, icon: '📸' },
];
