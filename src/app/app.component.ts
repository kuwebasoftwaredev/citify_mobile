import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    const applyDarkClass = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = document.body.classList.contains('dark') || prefersDark;

      document.documentElement.classList.toggle('dark', shouldUseDark);
      document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light';
    };

    applyDarkClass();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener?.('change', applyDarkClass);

    const observer = new MutationObserver(() => applyDarkClass());
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
}
