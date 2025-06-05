# Complaint Portal

An Electron-based desktop application for managing complaints efficiently. This application provides user authentication, complaint registration, search, editing, merging/unmerging complaints, file uploads, and backup functionality.

## Features

- User authentication with role-based access
- Register and save complaints with detailed information
- Search and filter complaints by various criteria
- Edit complaint details and update associated files
- Merge multiple complaints into one and unmerge them if needed
- Export complaint data to Excel and PDF formats
- Automatic backup of database and uploaded files
- Dashboard with statistics on total, pending, and resolved complaints
- File upload and download support
- Single instance application with logging

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) installed.
2. Clone or download this repository.
3. Navigate to the project directory in your terminal.
4. Install dependencies:

```bash
npm install
```

## Usage

To start the application in development mode, run:

```bash
npm start
```

This will launch the Electron app with logging enabled.

## Build

To build a Windows installer for the application, run:

```bash
npm run build
```

The installer will be created in the `dist` directory.

## Dependencies

- [Electron](https://www.electronjs.org/) - Framework for building desktop apps
- [bcrypt](https://www.npmjs.com/package/bcrypt) - Password hashing
- [sqlite3](https://www.n<create_file>
<path>README.md</path>
<content>
# Complaint Portal

An Electron-based desktop application for managing complaints efficiently. This application provides user authentication, complaint registration, search, editing, merging/unmerging complaints, file uploads, and backup functionality.

## Features

- User authentication with role-based access
- Register and save complaints with detailed information
- Search and filter complaints by various criteria
- Edit complaint details and update associated files
- Merge multiple complaints into one and unmerge them if needed
- Export complaint data to Excel and PDF formats
- Automatic backup of database and uploaded files
- Download search results in Excel or PDF format
- Responsive and user-friendly interface built with Electron

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) installed (version 16 or higher recommended).
2. Clone or download this repository.
3. Open a terminal in the project directory.
4. Install dependencies:

```bash
npm install
```

## Usage

To start the application in development mode, run:

```bash
npm start
```

This will launch the Electron app with logging enabled and GPU disabled.

## Build

To build a Windows installer for the application, run:

```bash
npm run build
```

The installer will be created in the `dist` directory. The build configuration uses `electron-builder` with NSIS installer settings.

## Dependencies

- [Electron](https://www.electronjs.org/) - Desktop application framework
- [sqlite3](https://www.npmjs.com/package/sqlite3) - SQLite database driver
- [bcrypt](https://www.npmjs.com/package/bcrypt) - Password hashing
- [docx](https://www.npmjs.com/package/docx) - Document generation
- [exceljs](https://www.npmjs.com/package/exceljs) - Excel file creation and manipulation
- [pdfkit](https://www.npmjs.com/package/pdfkit) - PDF generation
- [patch-package](https://www.npmjs.com/package/patch-package) - Patch management
- [postinstall-postinstall](https://www.npmjs.com/package/postinstall-postinstall) - Post-install scripts

## Author

V&R

## License

This project is licensed under the ISC License.
