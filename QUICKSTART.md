# Quick Start Guide 🚀

Get Alqawqaa Studio running in 3 steps!

## Step 1: Fix npm permissions (if needed)

If you see permission errors when installing, run:

```bash
sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
```

Enter your password when prompted.

---

## Step 2: Install all dependencies

Run the installation script:

```bash
./INSTALL.sh
```

This will install:
- React + TypeScript
- Electron
- Konva (for drawing charts)
- TailwindCSS
- Biome (linter)
- All other dependencies

**Note:** This may take 2-5 minutes depending on your internet speed.

---

## Step 3: Run the app

```bash
npm run dev
```

The Electron app will open automatically!

---

## What to do next

1. **Test the form** - Try filling out patient information
2. **Draw on charts** - Click on the audiometry and tympanometry charts
3. **Print test** - Click the print button to see the A4 layout
4. **Add your logo** - Replace `resources/clinic-logo.png` with your actual logo

---

## Building for production

When ready to distribute to clinic computers:

```bash
npm run package:win
```

This creates a Windows installer in the `release/` folder that you can install on clinic computers.

---

## Need help?

- Check [README.md](README.md) for full documentation
- Check [INSTALL.sh](INSTALL.sh) for detailed installation steps
- Review the code in `src/` folder

---

## Common Issues

### "npm permission errors"
→ Run the command from Step 1

### "Command not found: electron-vite"
→ Make sure all dependencies are installed: `npm install`

### "Port already in use"
→ Close other instances of the app and try again

### "Print doesn't work"
→ Make sure your printer is connected and drivers are installed
