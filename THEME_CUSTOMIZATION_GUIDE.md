# Theme Customization Guide

This guide shows you exactly where to adjust colors and styling for your application's light and dark modes.

## 🎨 Quick Color Adjustments

### **File Locations:**
- **Light Mode Colors:** `src/app/globals.css` (lines 1-50)
- **Dark Mode Colors:** `src/contexts/ThemeContext.tsx` (lines 30-120)

---

## 📍 Where to Make Changes

### **1. Core Colors (Background, Text, etc.)**
**File:** `src/app/globals.css` (lines 3-15)

```css
:root {
  --background: #f6f1e3;     /* ← Main page background */
  --foreground: #17150f;     /* ← Primary text color */
  --surface: #f6f1e2;        /* ← Card/section backgrounds */
  --surface-hover: #f4eedd;  /* ← Hover states */
  --muted: #7d765f;          /* ← Secondary text */
}
```

**Dark Mode Override:** `src/contexts/ThemeContext.tsx` (lines 35-40)

### **2. Header & Navigation**
**File:** `src/app/globals.css` (lines 25-30)

```css
--header-bg: rgba(246, 241, 227, 0.9);  /* ← Header background */
--header-text: #17150f;                  /* ← Header text */
--header-border: #ccc19e;                /* ← Header border */
--logo-color: #17150f;                   /* ← Logo color */
```

**Dark Mode Override:** `src/contexts/ThemeContext.tsx` (lines 50-55)

### **3. Buttons**
**File:** `src/app/globals.css` (lines 32-37)

```css
--button-bg: #f6f1e3;        /* ← Button background */
--button-text: #17150f;      /* ← Button text */
--button-hover-bg: #f4eedd;  /* ← Button hover */
--button-hover-text: #17150f; /* ← Button hover text */
--button-border: #ccc19e;    /* ← Button border */
```

**Dark Mode Override:** `src/contexts/ThemeContext.tsx` (lines 60-65)

### **4. Featured Section**
**File:** `src/app/globals.css` (lines 42-55)

```css
--featured-title: #ffffff;           /* ← Featured title (white) */
--featured-description: #ffffff;     /* ← Featured description */
--featured-tag-bg: rgba(255, 255, 255, 0.2);  /* ← Tag background */
--featured-tag-text: #ffffff;        /* ← Tag text */
```

**Note:** Featured section text stays white for contrast in both modes.

### **5. Exercise Cards**
**File:** `src/app/globals.css` (lines 57-65)

```css
--card-bg: #f6f1e3;                  /* ← Card background */
--card-title: #ffffff;               /* ← Card title (white) */
--card-description: #ffffff;         /* ← Card description (white) */
--play-icon-bg: rgba(0, 0, 0, 0.5); /* ← Play button background */
--play-icon-text: #ffffff;           /* ← Play button icon */
```

### **6. Carousel Controls**
**File:** `src/app/globals.css` (lines 67-72)

```css
--carousel-arrow-bg: rgba(53, 56, 57, 0.9);  /* ← Arrow background */
--carousel-arrow-hover-bg: #353839;          /* ← Arrow hover */
--carousel-arrow-text: #ffffff;              /* ← Arrow icon */
--carousel-fade: rgba(0, 0, 0, 0.42);        /* ← Fade edges */
```

### **7. Section Headers**
**File:** `src/app/globals.css` (lines 74-77)

```css
--section-title: #17150f;    /* ← Section titles */
--section-subtitle: #7d765f; /* ← Section subtitles */
--section-accent: #3b82f6;   /* ← Accent line color */
```

---

## 🎯 Common Customization Examples

### **Change Primary Blue Color:**
1. **Light Mode:** `src/app/globals.css` line 18: `--accent: #3b82f6;`
2. **Dark Mode:** `src/contexts/ThemeContext.tsx` line 42: `root.style.setProperty('--accent', '#3b82f6');`

### **Change Header Background:**
1. **Light Mode:** `src/app/globals.css` line 26: `--header-bg: rgba(246, 241, 227, 0.9);`
2. **Dark Mode:** `src/contexts/ThemeContext.tsx` line 51: `root.style.setProperty('--header-bg', 'rgba(24, 26, 26, 0.9)');`

### **Change Button Colors:**
1. **Light Mode:** `src/app/globals.css` lines 32-37
2. **Dark Mode:** `src/contexts/ThemeContext.tsx` lines 60-65

---

## 🔧 How to Add New Theme Variables

### **Step 1:** Add to `globals.css`
```css
:root {
  /* Your new variable */
  --my-new-color: #ff0000;
}
```

### **Step 2:** Add to `ThemeContext.tsx`
```javascript
// In the dark mode section
root.style.setProperty('--my-new-color', '#00ff00');

// In the light mode section  
root.style.setProperty('--my-new-color', '#ff0000');
```

### **Step 3:** Use in components
```jsx
<div style={{ color: 'var(--my-new-color)' }}>
  My styled text
</div>
```

---

## 🎨 Color Palette Reference

### **Light Mode (AP Colors):**
- `#f6f1e3` - Background (ap-10)
- `#17150f` - Text (ap-100)
- `#f4eedd` - Hover (ap-30)
- `#7d765f` - Muted (ap-70)
- `#ccc19e` - Borders (ap-50)

### **Dark Mode (Onyx Colors):**
- `#181a1a` - Background (onyx-100)
- `#eef0f1` - Text (onyx-40)
- `#353839` - Surface (onyx-90)
- `#555950` - Hover (onyx-80)
- `#777d7f` - Borders (onyx-70)

### **Accent Colors:**
- `#3b82f6` - Blue (primary)
- `#64FF58` - Green (success)
- `#ff8044` - Orange (warning)
- `#FC7C7C` - Red (error)

---

## 💡 Tips

1. **Test Both Modes:** Always check your changes in both light and dark mode
2. **Use CSS Variables:** Always use `var(--variable-name)` in components
3. **Contrast:** Ensure text has good contrast against backgrounds
4. **Consistency:** Keep similar elements using the same color variables
5. **Opacity:** Use rgba() for overlays and transparency effects

---

## 🚀 Quick Start

To change the main background color:
1. Open `src/app/globals.css`
2. Find line 4: `--background: #f6f1e3;`
3. Change the hex value
4. Open `src/contexts/ThemeContext.tsx`
5. Find the dark mode section and update the corresponding line
6. Save and test!

Your theme system is now clean, organized, and easy to customize! 🎉 