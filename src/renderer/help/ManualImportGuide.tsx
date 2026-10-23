import previewImage from './images/timetable-preview.png';
import sourceImage from './images/page-source.png';

export function ManualImportGuide(){
  return <section className="manual-guide" aria-label="Manual slot import guide">
      <p>In youtar_ttap, adding slots manually means importing the HTML from your course timetable page. Use a regular browser for the source-copying steps below. In the desktop login view, you can use Preview courses from this page instead.</p>
      <details className="illustrated-guide"><summary>View step-by-step screenshots</summary><p>These screenshots use sample course data. The UTAR page may look different.</p><div className="guide-images"><figure><img src={previewImage} alt="Example Course Timetable Preview with course codes, groups and meeting times"/><figcaption>1. Open Course Timetable Preview after signing in. Display the courses you need.</figcaption></figure><figure><img src={sourceImage} alt="Example page-source tab showing course HTML, with Ctrl A and Ctrl C copying instructions"/><figcaption>2. In a regular browser, press Ctrl + U. In the source tab, press Ctrl + A, then Ctrl + C.</figcaption></figure></div></details>
      <ol>
        <li><strong>Log in.</strong> Sign in to the Course Registration System, then open the same page in a regular browser to copy its source.</li>
        <li><strong>Open Course Timetable Preview.</strong> Display the course timetable data you want to arrange.</li>
        <li><strong>Open the page source.</strong> In your browser, press <kbd>Ctrl + U</kbd> or choose View page source from the context menu.</li>
        <li><strong>Copy the source.</strong> Press <kbd>Ctrl + A</kbd>, then <kbd>Ctrl + C</kbd> in the source tab.</li>
        <li><strong>Return to youtar_ttap.</strong> Choose Paste HTML, paste the source, then choose Preview import. Check the notes and choose Use these courses.</li>
        <li><strong>Include every page.</strong> If the preview has multiple pages, save each as an HTML file and import all pages together using HTML files. Importing a new set replaces the current courses.</li>
      </ol>
      <p>Your password stays in the UTAR website. Once imported, arranging a timetable works locally.</p>
  </section>;
}
