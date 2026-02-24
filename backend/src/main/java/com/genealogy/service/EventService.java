package com.genealogy.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.genealogy.entity.Event;
import com.genealogy.mapper.EventMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService extends ServiceImpl<EventMapper, Event> {

    /**
     * 查询某人的所有事件（按日期排序）
     */
    public List<Event> findByPersonId(Long personId) {
        return list(new LambdaQueryWrapper<Event>()
                .eq(Event::getPersonId, personId)
                .orderByAsc(Event::getEventDate));
    }

    /**
     * 查询全部事件（时间轴用）
     */
    public List<Event> allSorted() {
        return list(new LambdaQueryWrapper<Event>()
                .orderByAsc(Event::getEventDate));
    }

    /**
     * 删除某人的所有事件
     */
    public void removeByPersonId(Long personId) {
        remove(new LambdaQueryWrapper<Event>()
                .eq(Event::getPersonId, personId));
    }
}
