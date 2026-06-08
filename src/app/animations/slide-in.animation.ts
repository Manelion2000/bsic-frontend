import { trigger, state, style, transition, animate } from '@angular/animations';

export const slideInAnimation = trigger('slideIn', [
  transition(':enter', [
    style({
      transform: 'translateX(100%)',
      opacity: 0
    }),
    animate('300ms ease-out', style({
      transform: 'translateX(0)',
      opacity: 1
    }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({
      transform: 'translateX(100%)',
      opacity: 0
    }))
  ])
]);
