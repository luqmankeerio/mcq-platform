import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  contactNumber = '+92 300 123 4567';
  email = 'support@mcqlearning.com';
  address = 'Karachi, Pakistan';

  socialLinks = [
    {
      name: 'Facebook',
      url: 'https://facebook.com',
      icon: 'fa-brands fa-facebook-f',
      bgClass: 'facebook-bg'
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com',
      icon: 'fa-brands fa-instagram',
      bgClass: 'instagram-bg'
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com',
      icon: 'fa-brands fa-youtube',
      bgClass: 'youtube-bg'
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/923001234567',
      icon: 'fa-brands fa-whatsapp',
      bgClass: 'whatsapp-bg'
    }
  ];
}
