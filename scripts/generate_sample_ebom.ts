import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const generateEBOM = () => {
    const data = [
        ['Level', 'Part Number', 'Description', 'Quantity', 'Material Spec', 'Notes'],
        [0, 'BF-ASM-001', 'Main Industrial Chassis Assembly', 1, 'Aluminium 6061-T6', 'Primary assembly unit'],
        [1, 'BF-CH-001', 'External Housing Shell', 1, 'Steel Plat S235', 'Powder coated finish'],
        [2, 'BF-PN-001', 'Front Control Panel', 1, 'ABS Plastic', 'Injection moulded'],
        [3, 'BF-BTN-001', 'Industrial Push Button', 4, 'Polycarbonate', 'Emergency Stop compliant'],
        [3, 'BF-SCR-001', 'LED Status Screen 4.3\"', 1, 'Glass/LCD', 'Touch enabled'],
        [2, 'BF-BRK-001', 'Internal Mounting Bracket', 2, 'Stainless Steel 304', 'Laser cut'],
        [1, 'BF-EL-100', 'Power Distribution Board', 1, 'FR4 / Copper', 'Dual layer PCB'],
        [2, 'BF-CAP-100', 'Electrolytic Capacitor 100uF', 12, 'Mixed', 'SMD component'],
        [2, 'BF-RES-100', 'Precision Resistor 10k', 25, 'Thin Film', 'High stability'],
        [1, 'BF-MTR-001', 'NEMA 23 Stepper Motor', 3, 'Mixed Metals', 'High torque output'],
        [2, 'BF-SHF-001', 'Drive Shaft 8mm', 1, 'Hardened Chrome Steel', 'Precision ground'],
        [2, 'BF-GR-001', 'Planetary Gearbox 10:1', 1, 'Case Hardened Steel', 'Grease lubricated'],
        [3, 'BF-OIL-001', 'Industrial Synthetic Grease', 1, 'Lubricant', 'Applied during assembly'],
        [1, 'BF-FAS-001', 'Socket Head Cap Screw M5x15', 32, 'Grade 12.9 Steel', 'Zinc plated'],
        [1, 'BF-FAS-002', 'Washer Flat M5', 32, 'Stainless Steel', 'Spring washer'],
        [1, 'BF-FAS-003', 'Hex Nut M5', 32, 'Grade 12.9 Steel', 'Self-locking'],
        [1, 'BF-SL-001', 'Outer Edge Seal 200mm', 1, 'Rubber', 'Waterproof'],
        [1, 'BF-SL-002', 'Interface Gasket', 2, 'Silicone', 'Heat resistant'],
        [1, 'BF-CAB-001', 'Internal Wiring Harness', 1, 'Copper/PVC', 'Custom length'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'eBOM');

    const outputDir = path.join(__dirname, '..', '..', 'samples');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filePath = path.join(outputDir, 'industry_standard_ebom.xlsx');
    XLSX.writeFile(workbook, filePath);

    console.log(`Sample eBOM generated at: ${filePath}`);
};

generateEBOM();
