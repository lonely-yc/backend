package com.genealogy.controller;

import com.genealogy.dto.FamilyDTO;
import com.genealogy.dto.R;
import com.genealogy.entity.Family;
import com.genealogy.service.FamilyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/family")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyService familyService;

    @GetMapping("/list")
    public R<List<Family>> list() {
        return R.ok(familyService.listAll());
    }

    @GetMapping("/{id}")
    public R<Family> getById(@PathVariable Long id) {
        Family f = familyService.getById(id);
        return f != null ? R.ok(f) : R.fail("家族不存在");
    }

    @PostMapping
    public R<Family> create(@Valid @RequestBody FamilyDTO dto, HttpServletRequest request) {
        if (!"ADMIN".equals(request.getAttribute("role"))) {
            return R.fail(403, "仅管理员可操作");
        }
        Family entity = new Family();
        BeanUtils.copyProperties(dto, entity);
        entity.setMemberCount(0);
        familyService.save(entity);
        return R.ok(entity);
    }

    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody FamilyDTO dto, HttpServletRequest request) {
        if (!"ADMIN".equals(request.getAttribute("role"))) {
            return R.fail(403, "仅管理员可操作");
        }
        Family entity = familyService.getById(id);
        if (entity == null) return R.fail("家族不存在");
        BeanUtils.copyProperties(dto, entity, "id", "memberCount");
        familyService.updateById(entity);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        if (!"ADMIN".equals(request.getAttribute("role"))) {
            return R.fail(403, "仅管理员可操作");
        }
        familyService.removeById(id);
        return R.ok();
    }
}
