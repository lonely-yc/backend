package com.genealogy.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.dto.PersonDTO;
import com.genealogy.dto.R;
import com.genealogy.dto.TreeNodeDTO;
import com.genealogy.entity.OperateLog;
import com.genealogy.entity.Person;
import com.genealogy.service.EventService;
import com.genealogy.service.FamilyService;
import com.genealogy.service.OperateLogService;
import com.genealogy.service.PersonService;
import com.genealogy.service.RelationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/person")
@RequiredArgsConstructor
@Slf4j
public class PersonController {

    private final PersonService personService;
    private final RelationService relationService;
    private final EventService eventService;
    private final FamilyService familyService;
    private final OperateLogService operateLogService;
    private final ObjectMapper objectMapper;

    @GetMapping("/list")
    public R<List<Person>> list(@RequestParam(required = false) String keyword,
                                @RequestParam(required = false) Long familyId) {
        return R.ok(personService.search(keyword, familyId));
    }

    @GetMapping("/{id}")
    public R<Person> getById(@PathVariable Long id) {
        Person p = personService.getById(id);
        return p != null ? R.ok(p) : R.fail("人物不存在");
    }

    @PostMapping
    public R<Person> add(@Valid @RequestBody PersonDTO dto, HttpServletRequest request) {
        Person entity = new Person();
        BeanUtils.copyProperties(dto, entity);
        personService.save(entity);
        familyService.refreshMemberCount(entity.getFamilyId());

        // 记录日志
        try {
            Map<String, Object> detail = new HashMap<>();
            detail.put("name", entity.getName());
            detail.put("gender", entity.getGender());
            detail.put("generation", entity.getGeneration());
            operateLogService.log(
                    OperateLog.OperateType.PERSON_ADD,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    entity.getId(),
                    entity.getName(),
                    "PERSON",
                    entity.getFamilyId(),
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok(entity);
    }

    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody PersonDTO dto, HttpServletRequest request) {
        Person entity = personService.getById(id);
        if (entity == null) return R.fail("人物不存在");

        // 记录变更前的数据
        Map<String, Object> before = new HashMap<>();
        before.put("name", entity.getName());
        before.put("gender", entity.getGender());
        before.put("generation", entity.getGeneration());
        before.put("birthDate", entity.getBirthDate());
        before.put("deathDate", entity.getDeathDate());
        before.put("birthPlace", entity.getBirthPlace());
        before.put("bio", entity.getBio());

        BeanUtils.copyProperties(dto, entity, "id");
        personService.updateById(entity);

        // 记录变更后的数据和变更内容
        try {
            Map<String, Object> after = new HashMap<>();
            after.put("name", entity.getName());
            after.put("gender", entity.getGender());
            after.put("generation", entity.getGeneration());
            after.put("birthDate", entity.getBirthDate());
            after.put("deathDate", entity.getDeathDate());
            after.put("birthPlace", entity.getBirthPlace());
            after.put("bio", entity.getBio());

            Map<String, Object> detail = new HashMap<>();
            detail.put("before", before);
            detail.put("after", after);

            operateLogService.log(
                    OperateLog.OperateType.PERSON_EDIT,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    entity.getId(),
                    entity.getName(),
                    "PERSON",
                    entity.getFamilyId(),
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        Person p = personService.getById(id);
        if (p == null) return R.fail("人物不存在");
        Long familyId = p.getFamilyId();
        String personName = p.getName();

        // 记录删除前的数据
        Map<String, Object> detail = new HashMap<>();
        detail.put("name", p.getName());
        detail.put("gender", p.getGender());
        detail.put("generation", p.getGeneration());

        personService.removeById(id);
        relationService.removeByPersonId(id);
        eventService.removeByPersonId(id);
        familyService.refreshMemberCount(familyId);

        // 记录日志
        try {
            operateLogService.log(
                    OperateLog.OperateType.PERSON_DELETE,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    id,
                    personName,
                    "PERSON",
                    familyId,
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok();
    }

    @PatchMapping("/{id}/star")
    public R<Void> toggleStar(@PathVariable Long id) {
        Person p = personService.getById(id);
        if (p == null) return R.fail("人物不存在");
        p.setIsStarred(!Boolean.TRUE.equals(p.getIsStarred()));
        personService.updateById(p);
        return R.ok();
    }

    @GetMapping("/tree")
    public R<TreeNodeDTO> tree(@RequestParam(required = false) Long familyId) {
        return R.ok(personService.buildTree(familyId));
    }

    @GetMapping("/stats")
    public R<Map<String, Object>> stats(@RequestParam(required = false) Long familyId) {
        return R.ok(personService.stats(familyId));
    }
}
