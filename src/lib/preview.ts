// Founders preview (owner's decision 2026-11-23). Only the founders website is built with
// EXPO_PUBLIC_FOUNDERS_PREVIEW=yes (npm run build:web:founders). There, founding businesses set up their own account
// and listings, but nobody can message or call a business yet: the note box, Send note and Call buttons are replaced
// by a notice. The phone apps, the test website and the launch website never set it, so they work as normal.
export const FOUNDERS_PREVIEW = process.env.EXPO_PUBLIC_FOUNDERS_PREVIEW === 'yes';
export const PREVIEW_NOTICE = 'Servly opens on Thursday 7 January. Messages and calls to businesses start then.';
