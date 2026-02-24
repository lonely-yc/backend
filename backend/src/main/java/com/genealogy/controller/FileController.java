package com.genealogy.controller;

import com.genealogy.dto.R;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/file")
public class FileController {

    private static final String UPLOAD_DIR = "uploads";

    @PostMapping("/upload")
    public R<Map<String, String>> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return R.fail("文件不能为空");
        }

        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf("."));
        }

        // Only allow image files
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return R.fail("只允许上传图片文件");
        }

        String newName = UUID.randomUUID().toString().replace("-", "") + ext;
        Path dir = Paths.get(UPLOAD_DIR);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        Path dest = dir.resolve(newName);
        file.transferTo(dest.toFile());

        Map<String, String> data = new HashMap<>();
        data.put("url", "/uploads/" + newName);
        return R.ok(data);
    }
}
