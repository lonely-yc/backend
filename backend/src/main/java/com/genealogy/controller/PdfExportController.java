package com.genealogy.controller;

import com.genealogy.entity.Family;
import com.genealogy.service.PdfExportService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class PdfExportController {

    private final PdfExportService pdfExportService;

    /**
     * 导出欧式族谱 PDF
     */
    @GetMapping("/pdf/ou-style/{familyId}")
    public void exportOuStyle(
            @PathVariable Long familyId,
            HttpServletResponse response) throws Exception {
        byte[] pdfBytes = pdfExportService.exportOuStyle(familyId);

        Family family = // 需要注入 FamilyMapper
            null;

        response.setContentType("application/pdf");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + URLEncoder.encode("族谱_欧式", StandardCharsets.UTF_8) + ".pdf\"");
        response.getOutputStream().write(pdfBytes);
        response.getOutputStream().flush();
    }

    /**
     * 导出苏式族谱 PDF
     */
    @GetMapping("/pdf/su-style/{familyId}")
    public void exportSuStyle(
            @PathVariable Long familyId,
            HttpServletResponse response) throws Exception {
        byte[] pdfBytes = pdfExportService.exportSuStyle(familyId);

        response.setContentType("application/pdf");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + URLEncoder.encode("族谱_苏式", StandardCharsets.UTF_8) + ".pdf\"");
        response.getOutputStream().write(pdfBytes);
        response.getOutputStream().flush();
    }

    /**
     * 导出族谱（选择风格）
     */
    @GetMapping("/pdf/{familyId}")
    public void exportPdf(
            @PathVariable Long familyId,
            @RequestParam(defaultValue = "ou") String style,
            HttpServletResponse response) throws Exception {
        byte[] pdfBytes;
        String filename;

        if ("su".equals(style)) {
            pdfBytes = pdfExportService.exportSuStyle(familyId);
            filename = "族谱_苏式";
        } else {
            pdfBytes = pdfExportService.exportOuStyle(familyId);
            filename = "族谱_欧式";
        }

        response.setContentType("application/pdf");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + URLEncoder.encode(filename, StandardCharsets.UTF_8) + ".pdf\"");
        response.getOutputStream().write(pdfBytes);
        response.getOutputStream().flush();
    }
}
