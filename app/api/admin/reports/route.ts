import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import MealRequest from '@/lib/models/MealRequest';
import MealPrice from '@/lib/models/MealPrice';
import TopUp from '@/lib/models/TopUp';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Monkey-patch fs.readFileSync to resolve standard afm font path loading under Next.js/Turbopack
if (fs && typeof fs.readFileSync === 'function') {
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = function (filePath: any, options: any) {
    if (typeof filePath === 'string' && filePath.includes('pdfkit') && filePath.endsWith('.afm')) {
      const filename = path.basename(filePath);
      const actualPath = path.resolve(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data', filename);
      return originalReadFileSync(actualPath, options);
    }
    return originalReadFileSync(filePath, options);
  } as any;
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') ?? new Date().toISOString().slice(0, 10);
    const endDate = searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10);
    const format = searchParams.get('format'); // csv, xlsx, pdf
    const mealType = searchParams.get('mealType'); // breakfast, lunch, dinner

    await connectDB();

    // Convert dates for TopUp queries
    const startOfDay = new Date(`${startDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${endDate}T23:59:59.999Z`);

    // Fetch meal requests in date range, populated with user info
    const requests = await MealRequest.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('userId', 'fullName employeeId workEmail walletBalance')
      .sort({ date: -1 })
      .lean();

    // Fetch top-ups in date range
    const topups = await TopUp.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // Fetch prices to resolve single meal prices
    const prices = await MealPrice.findOne().lean();

    // Filter requests by mealType if provided
    let filteredRequests = requests;
    if (mealType && ['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      filteredRequests = requests.filter((r: any) => r[mealType] === true);
    }

    // Aggregate topups by userId
    const topupsByUser: Record<string, { totalAmount: number; count: number; details: string }> = {};
    for (const t of topups) {
      const uId = String(t.userId);
      if (!topupsByUser[uId]) {
        topupsByUser[uId] = { totalAmount: 0, count: 0, details: '' };
      }
      topupsByUser[uId].totalAmount += t.amount;
      topupsByUser[uId].count += 1;
    }
    // format details string
    for (const uId of Object.keys(topupsByUser)) {
      const tGroup = topupsByUser[uId];
      tGroup.details = `Rs.${Number(tGroup.totalAmount || 0).toFixed(2)} (${tGroup.count} top-up${tGroup.count > 1 ? 's' : ''})`;
    }

    // Map requests to include calculated properties for the report table
    let totalMealsCount = 0;
    let totalIncomeAmount = 0;
    let totalTopupsAmount = topups.reduce((sum, t) => sum + t.amount, 0);

    const reportRows = filteredRequests.map((r: any) => {
      const user = r.userId || {};
      const uId = String(user._id || '');
      
      let mealsCount = 0;
      let mealCost = 0;

      if (mealType && ['breakfast', 'lunch', 'dinner'].includes(mealType)) {
        mealsCount = 1;
        mealCost = mealType === 'breakfast' ? (prices?.breakfastPrice ?? 0) :
                   mealType === 'lunch' ? (prices?.lunchPrice ?? 0) :
                   (prices?.dinnerPrice ?? 0);
      } else {
        mealsCount = (r.breakfast ? 1 : 0) + (r.lunch ? 1 : 0) + (r.dinner ? 1 : 0);
        mealCost = r.totalAmount || 0;
      }

      totalMealsCount += mealsCount;
      totalIncomeAmount += mealCost;

      return {
        userName: user.fullName || 'Unknown User',
        employeeId: user.employeeId || 'N/A',
        workEmail: user.workEmail || 'N/A',
        date: r.date,
        breakfast: r.breakfast ? 'Yes' : 'No',
        lunch: r.lunch ? 'Yes' : 'No',
        dinner: r.dinner ? 'Yes' : 'No',
        mealCost,
        walletBalance: user.walletBalance ?? 0,
        topupDetails: topupsByUser[uId]?.details || 'None',
        mealsCount,
      };
    });

    const summary = {
      totalMeals: totalMealsCount,
      totalIncome: totalIncomeAmount,
      totalTopups: totalTopupsAmount,
      startDate,
      endDate,
    };

    // Handle format exports
    if (format === 'csv') {
      const headers = mealType 
        ? ['S.No.', 'User Name']
        : [
            'User Name',
            'Employee ID',
            'Work Email',
            'Date',
            'Breakfast',
            'Lunch',
            'Dinner',
            'Meal Cost',
            'Meals Count',
          ];

      let csvContent = headers.join(',') + '\n';
      let index = 1;
      for (const row of reportRows) {
        const line = mealType
          ? [
              index++,
              `"${row.userName.replace(/"/g, '""')}"`,
            ]
          : [
              `"${row.userName.replace(/"/g, '""')}"`,
              `"${row.employeeId.replace(/"/g, '""')}"`,
              `"${row.workEmail.replace(/"/g, '""')}"`,
              `"${row.date}"`,
              `"${row.breakfast}"`,
              `"${row.lunch}"`,
              `"${row.dinner}"`,
              row.mealCost,
              row.mealsCount,
            ];
        csvContent += line.join(',') + '\n';
      }

      // Add summary row at the bottom
      csvContent += '\nSummary Info\n';
      csvContent += `Start Date,${startDate}\n`;
      csvContent += `End Date,${endDate}\n`;
      if (mealType) {
        csvContent += `Total ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Count,${totalMealsCount}\n`;
      } else {
        csvContent += `Total Meals Count,${totalMealsCount}\n`;
        csvContent += `Total Income in Range,Rs.${Number(totalIncomeAmount || 0).toFixed(2)}\n`;
        csvContent += `Total Top-ups in Range,Rs.${Number(totalTopupsAmount || 0).toFixed(2)}\n`;
      }

      const filename = mealType
        ? `chammery_${mealType}_report_${startDate}_to_${endDate}.csv`
        : `chammery_report_${startDate}_to_${endDate}.csv`;

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=${filename}`,
        },
      });
    }

    if (format === 'xlsx') {
      let index = 1;
      const wsData = reportRows.map((row) => {
        if (mealType) {
          return {
            'S.No.': index++,
            'User Name': row.userName,
          };
        } else {
          return {
            'User Name': row.userName,
            'Employee ID': row.employeeId,
            'Work Email': row.workEmail,
            'Date': row.date,
            'Breakfast': row.breakfast,
            'Lunch': row.lunch,
            'Dinner': row.dinner,
            'Meal Cost (INR)': row.mealCost,
            'Meals Count': row.mealsCount,
          };
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(wsData);
      const sheetName = mealType ? `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Report` : 'Meal Report';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Add summary sheet
      const summaryData = mealType
        ? [
            { Metric: 'Start Date', Value: startDate },
            { Metric: 'End Date', Value: endDate },
            { Metric: `Total ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Count`, Value: totalMealsCount },
          ]
        : [
            { Metric: 'Start Date', Value: startDate },
            { Metric: 'End Date', Value: endDate },
            { Metric: 'Total Meals Count', Value: totalMealsCount },
            { Metric: 'Total Income in Range (INR)', Value: totalIncomeAmount },
            { Metric: 'Total Top-ups in Range (INR)', Value: totalTopupsAmount },
          ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const filename = mealType
        ? `chammery_${mealType}_report_${startDate}_to_${endDate}.xlsx`
        : `chammery_report_${startDate}_to_${endDate}.xlsx`;

      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=${filename}`,
        },
      });
    }

    if (format === 'pdf') {
      const isLandscape = !mealType;
      const doc = new PDFDocument({ 
        margin: 30, 
        size: 'A4', 
        layout: isLandscape ? 'landscape' : 'portrait' 
      });
      const chunks: any[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      
      const dateText = startDate === endDate 
        ? `Report Date: ${startDate}` 
        : `Report Range: ${startDate} to ${endDate}`;

      // Custom Color Themes based on Meal Type
      const bannerColor = mealType === 'breakfast' ? '#a85507' :
                          mealType === 'lunch' ? '#166534' :
                          mealType === 'dinner' ? '#1e3a8a' :
                          '#4E220F';
      const bannerBg = mealType === 'breakfast' ? '#fef3c7' :
                        mealType === 'lunch' ? '#dcfce7' :
                        mealType === 'dinner' ? '#dbeafe' :
                        '#F7F1DE';

      const bannerWidth = isLandscape ? 842 : 595;
      const rightAlignX = isLandscape ? 500 : 300;
      const rightAlignW = isLandscape ? 302 : 255;
      const tableWidth = isLandscape ? 762 : 515;
      const tableLineTo = isLandscape ? 802 : 555;
      const maxPageY = isLandscape ? 520 : 760;

      // Brand Header Banner
      doc.rect(0, 0, bannerWidth, 60).fill(bannerColor);
      
      // Header Title
      const titleText = mealType
        ? `CHAMMERY OFFICE ${mealType.toUpperCase()} CHECKLIST`
        : 'CHAMMERY OFFICE MEALS REPORT';
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text(titleText, 40, 22);
      
      // Date Subheader in banner
      doc.fillColor(bannerBg === '#F7F1DE' ? '#F7F1DE' : '#FFFFFF').font('Helvetica-Bold').fontSize(11).text(dateText, rightAlignX, 25, { width: rightAlignW, align: 'right' });

      const startY = 90;

      // Table Header Row fill
      doc.rect(40, startY - 4, tableWidth, 18).fill(bannerBg);
      
      // Table Header Labels
      doc.fillColor(bannerColor).font('Helvetica-Bold').fontSize(9);
      if (mealType) {
        doc.text('S.No.', 45, startY, { width: 50 });
        doc.text('User Name', 110, startY, { width: 350 });
      } else {
        doc.text('User Name', 45, startY);
        doc.text('Breakfast', 310, startY, { width: 80, align: 'center' });
        doc.text('Lunch', 410, startY, { width: 80, align: 'center' });
        doc.text('Dinner', 510, startY, { width: 80, align: 'center' });
        doc.text('Cost', 610, startY, { width: 80, align: 'right' });
        doc.text('Meals Count', 710, startY, { width: 80, align: 'right' });
      }

      // Draw double border bottom for header
      doc.moveTo(40, startY + 16).lineTo(tableLineTo, startY + 16).strokeColor('#B0BA99').lineWidth(1.5).stroke();
      doc.moveDown(0.8);

      let currentY = startY + 24;
      let pdfIndex = 1;

      for (const row of reportRows) {
        if (currentY > maxPageY) {
          doc.addPage({ 
            size: 'A4', 
            layout: isLandscape ? 'landscape' : 'portrait', 
            margin: 30 
          });
          
          // Redraw Header Banner on new page
          doc.rect(0, 0, bannerWidth, 60).fill(bannerColor);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text(titleText, 40, 22);
          doc.fillColor(bannerBg === '#F7F1DE' ? '#F7F1DE' : '#FFFFFF').font('Helvetica-Bold').fontSize(11).text(dateText, rightAlignX, 25, { width: rightAlignW, align: 'right' });

          const pageStartY = 90;
          doc.rect(40, pageStartY - 4, tableWidth, 18).fill(bannerBg);
          doc.fillColor(bannerColor).font('Helvetica-Bold').fontSize(9);
          if (mealType) {
            doc.text('S.No.', 45, pageStartY, { width: 50 });
            doc.text('User Name', 110, pageStartY, { width: 350 });
          } else {
            doc.text('User Name', 45, pageStartY);
            doc.text('Breakfast', 310, pageStartY, { width: 80, align: 'center' });
            doc.text('Lunch', 410, pageStartY, { width: 80, align: 'center' });
            doc.text('Dinner', 510, pageStartY, { width: 80, align: 'center' });
            doc.text('Cost', 610, pageStartY, { width: 80, align: 'right' });
            doc.text('Meals Count', 710, pageStartY, { width: 80, align: 'right' });
          }

          doc.moveTo(40, pageStartY + 16).lineTo(tableLineTo, pageStartY + 16).strokeColor('#B0BA99').lineWidth(1.5).stroke();
          currentY = pageStartY + 24;
        }

        // Row Content
        if (mealType) {
          doc.fillColor('#4E220F').font('Helvetica').fontSize(9).text(String(pdfIndex++), 45, currentY, { width: 50 });
          doc.fillColor('#4E220F').font('Helvetica').text(row.userName, 110, currentY, { width: 350, lineBreak: false });
        } else {
          doc.fillColor('#4E220F').font('Helvetica').fontSize(9).text(row.userName, 45, currentY, { width: 250, lineBreak: false });

          // Styled check status indicators
          if (row.breakfast === 'Yes') {
            doc.fillColor('#22c55e').font('Helvetica-Bold').text('Yes', 310, currentY, { width: 80, align: 'center' });
          } else {
            doc.fillColor('#94a3b8').font('Helvetica').text('-', 310, currentY, { width: 80, align: 'center' });
          }

          if (row.lunch === 'Yes') {
            doc.fillColor('#22c55e').font('Helvetica-Bold').text('Yes', 410, currentY, { width: 80, align: 'center' });
          } else {
            doc.fillColor('#94a3b8').font('Helvetica').text('-', 410, currentY, { width: 80, align: 'center' });
          }

          if (row.dinner === 'Yes') {
            doc.fillColor('#22c55e').font('Helvetica-Bold').text('Yes', 510, currentY, { width: 80, align: 'center' });
          } else {
            doc.fillColor('#94a3b8').font('Helvetica').text('-', 510, currentY, { width: 80, align: 'center' });
          }

          doc.fillColor('#4E220F').font('Helvetica-Bold').text(`Rs.${Number(row.mealCost || 0).toFixed(2)}`, 610, currentY, { width: 80, align: 'right' });
          doc.fillColor('#4E220F').font('Helvetica').text(String(row.mealsCount), 710, currentY, { width: 80, align: 'right' });
        }

        // Soft divider line below row
        doc.moveTo(40, currentY + 12).lineTo(tableLineTo, currentY + 12).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

        currentY += 18;
      }

      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });

      doc.end();

      const pdfBuffer = await pdfPromise;

      const filename = mealType
        ? `chammery_${mealType}_report_${startDate}_to_${endDate}.pdf`
        : `chammery_report_${startDate}_to_${endDate}.pdf`;

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=${filename}`,
        },
      });
    }

    return NextResponse.json({
      requests: reportRows,
      summary,
    });
  } catch (err: any) {
    console.error('[reports GET error]', err);
    return NextResponse.json({
      error: 'Failed to generate report.',
      details: err?.message || String(err),
    }, { status: 500 });
  }
}
