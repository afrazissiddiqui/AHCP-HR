import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="edit-profile-page">
      <h1>Edit profile</h1>
      <p class="hint">Update your profile details here. This screen is a placeholder you can extend with real fields.</p>
      <a routerLink="/dashboard" class="back-link">← Back to home</a>
    </div>
  `,
  styles: [
    `
      .edit-profile-page {
        max-width: 720px;
        margin: 2rem auto;
        padding: 0 1.5rem;
        font-family: '72', Arial, sans-serif;
      }
      h1 {
        font-size: 1.5rem;
        color: #1d2d3e;
        margin: 0 0 0.75rem;
      }
      .hint {
        color: #556b82;
        margin: 0 0 1.5rem;
        line-height: 1.5;
      }
      .back-link {
        color: #0064d9;
        font-weight: 600;
        text-decoration: none;
      }
      .back-link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class EditProfileComponent {}
