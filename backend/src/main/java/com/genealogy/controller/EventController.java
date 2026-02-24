package com.genealogy.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.dto.EventDTO;
import com.genealogy.dto.R;
import com.genealogy.entity.Event;
import com.genealogy.entity.OperateLog;
import com.genealogy.entity.Person;
import com.genealogy.service.EventService;
import com.genealogy.service.OperateLogService;
import com.genealogy.service.PersonService;
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
@RequestMapping("/api/event")
@RequiredArgsConstructor
@Slf4j
public class EventController {

    private final EventService eventService;
    private final PersonService personService;
    private final OperateLogService operateLogService;
    private final ObjectMapper objectMapper;

    /** 查询某人的事件 */
    @GetMapping("/person/{personId}")
    public R<List<Event>> byPerson(@PathVariable Long personId) {
        return R.ok(eventService.findByPersonId(personId));
    }

    /** 查询全部事件（时间轴） */
    @GetMapping("/all")
    public R<List<Event>> all() {
        return R.ok(eventService.allSorted());
    }

    /** 新增事件 */
    @PostMapping
    public R<Event> add(@Valid @RequestBody EventDTO dto, HttpServletRequest request) {
        Event entity = new Event();
        BeanUtils.copyProperties(dto, entity);
        eventService.save(entity);

        // 记录日志
        try {
            Person person = personService.getById(dto.getPersonId());

            Map<String, Object> detail = new HashMap<>();
            detail.put("personId", dto.getPersonId());
            detail.put("personName", person != null ? person.getName() : "");
            detail.put("type", dto.getType());
            detail.put("typeDesc", getEventTypeDesc(dto.getType()));
            detail.put("title", dto.getTitle());
            detail.put("eventDate", dto.getEventDate());
            detail.put("description", dto.getDescription());

            Long familyId = person != null ? person.getFamilyId() : null;
            operateLogService.log(
                    OperateLog.OperateType.EVENT_ADD,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    entity.getId(),
                    (person != null ? person.getName() : "") + " - " + dto.getTitle(),
                    "EVENT",
                    familyId,
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok(entity);
    }

    private String getEventTypeDesc(String type) {
        switch (type) {
            case "birth": return "出生";
            case "death": return "去世";
            case "marriage": return "婚姻";
            case "migration": return "迁徙";
            case "achievement": return "功名";
            default: return "其他";
        }
    }

    /** 修改事件 */
    @PutMapping("/{id}")
    public R<Void> update(@PathVariable Long id, @Valid @RequestBody EventDTO dto, HttpServletRequest request) {
        Event entity = eventService.getById(id);
        if (entity == null) return R.fail("事件不存在");

        // 记录变更前
        Map<String, Object> before = new HashMap<>();
        before.put("type", entity.getType());
        before.put("title", entity.getTitle());
        before.put("eventDate", entity.getEventDate());
        before.put("description", entity.getDescription());

        BeanUtils.copyProperties(dto, entity, "id");
        eventService.updateById(entity);

        // 记录日志
        try {
            Person person = personService.getById(dto.getPersonId());

            Map<String, Object> detail = new HashMap<>();
            detail.put("before", before);

            Map<String, Object> after = new HashMap<>();
            after.put("type", dto.getType());
            after.put("title", dto.getTitle());
            after.put("eventDate", dto.getEventDate());
            after.put("description", dto.getDescription());
            detail.put("after", after);

            Long familyId = person != null ? person.getFamilyId() : null;
            operateLogService.log(
                    OperateLog.OperateType.EVENT_EDIT,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    id,
                    (person != null ? person.getName() : "") + " - " + dto.getTitle(),
                    "EVENT",
                    familyId,
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok();
    }

    /** 删除事件 */
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        Event entity = eventService.getById(id);
        if (entity == null) return R.fail("事件不存在");

        Person person = personService.getById(entity.getPersonId());

        // 记录删除前的事件信息
        Map<String, Object> detail = new HashMap<>();
        detail.put("personId", entity.getPersonId());
        detail.put("personName", person != null ? person.getName() : "");
        detail.put("type", entity.getType());
        detail.put("title", entity.getTitle());
        detail.put("eventDate", entity.getEventDate());
        detail.put("description", entity.getDescription());

        Long familyId = person != null ? person.getFamilyId() : null;

        eventService.removeById(id);

        // 记录日志
        try {
            operateLogService.log(
                    OperateLog.OperateType.EVENT_DELETE,
                    (Long) request.getAttribute("userId"),
                    (String) request.getAttribute("displayName"),
                    id,
                    (person != null ? person.getName() : "") + " - " + entity.getTitle(),
                    "EVENT",
                    familyId,
                    objectMapper.writeValueAsString(detail)
            );
        } catch (Exception e) {
            log.error("记录操作日志失败", e);
        }

        return R.ok();
    }
}
