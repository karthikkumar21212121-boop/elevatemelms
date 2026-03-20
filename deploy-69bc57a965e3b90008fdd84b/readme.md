# ElevateMe LMS

5-week career bootcamp. Deployed on Netlify, hosted on GitHub.

---

## URLs

| Who        | URL                                      |
|------------|------------------------------------------|
| Students   | `https://yourdomain.com`                 |
| Admin      | `https://yourdomain.com?admin=true`      |
| Week 1     | `https://yourdomain.com/week1`           |
| Week 2     | `https://yourdomain.com/week2`           |

---

## Folder Structure

```
elevateme-lms/
├── index.html          ← Dashboard (all week cards)
├── netlify.toml        ← Netlify config
├── shared/
│   ├── styles.css      ← ALL brand colors & styles (edit here)
│   └── app.js          ← ALL shared logic (sidebar, video, progress)
├── week1/
│   └── index.html      ← Week 1 content
├── week2/
│   └── index.html
├── week3/
│   └── index.html
├── week4/
│   └── index.html
├── week5/
│   └── index.html
└── videos/             ← Optional: local .mp4 files
    └── week1-time-management.mp4
```

---

## Deploy to Netlify (first time)

1. Push this folder to GitHub
2. Go to app.netlify.com → Add new site → Import from Git
3. Select your repo, leave build settings blank
4. Click Deploy — live in ~30 seconds

---

## Update Videos (Admin)

1. Open `yourdomain.com/week1?admin=true`
2. Navigate to the module
3. Paste YouTube / Vimeo / Google Drive / .mp4 URL
4. Click **Save Video**

For autoplay, use a self-hosted `.mp4` URL:
- Upload to `videos/` folder and push to GitHub, OR
- Upload to Cloudflare R2 and use the public URL

---

## Add / Edit Content

### Change text, takeaways, action items
Open the relevant `weekN/index.html` and find the `MODULES` array.
Each module has: `title`, `subtitle`, `notes`, `takeaways`, `action`, `resources`.

### Change colors
Open `shared/styles.css` and edit the `:root` variables at the top:
```css
:root {
    --brand-dark:   #1a1a1a;
    --brand-teal:   #619a84;   ← main green
    --brand-accent: #c65343;   ← red accent
    --bg-light:     #f9fbfa;
    --text-main:    #2d3436;
}
```

### Add a new week (e.g. Week 6)

1. Create folder `week6/`
2. Copy `week5/index.html` → `week6/index.html`
3. Change `WEEK_NUM = 6` and update all module IDs to `w6m1`, `w6m2` etc.
4. Update `MODULES` array with your new content
5. Add Week 6 to the `WEEKS` array in `index.html`
6. Add redirect in `netlify.toml`
7. Push to GitHub — Netlify auto-deploys

### Add a module to an existing week

In `weekN/index.html`, add a new object to the `MODULES` array:
```js
{
  id: 'w1m6',                    // unique ID
  icon: 'fa-star',               // Font Awesome icon class
  title: 'Module Title',
  subtitle: 'Short description',
  hasVideo: true,                // show video player
  notes: `<p>Your HTML content here</p>`,
  takeaways: ['Point 1', 'Point 2', 'Point 3'],
  action: 'What the student should do after this lesson.',
  resources: [
    { label: 'Resource Name', icon: 'fa-file-pdf', tag: 'PDF', url: 'https://...' }
  ]
}
```

---

## Deploy updates

Any time you change a file:
```bash
git add .
git commit -m "describe your change"
git push
```
Netlify auto-deploys within 30 seconds. No manual steps needed.

---

## Coach Details (Week 1, Module 3)

To update coach info, open `week1/index.html` and find module `w1m3`.
