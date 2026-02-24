package com.genealogy.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.genealogy.entity.Relation;
import com.genealogy.mapper.RelationMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RelationService extends ServiceImpl<RelationMapper, Relation> {

    /**
     * 查询某人相关的所有关系
     */
    public List<Relation> findByPersonId(Long personId) {
        return list(new LambdaQueryWrapper<Relation>()
                .eq(Relation::getFromId, personId)
                .or()
                .eq(Relation::getToId, personId));
    }

    /**
     * 删除某人的所有关系
     */
    public void removeByPersonId(Long personId) {
        remove(new LambdaQueryWrapper<Relation>()
                .eq(Relation::getFromId, personId)
                .or()
                .eq(Relation::getToId, personId));
    }
}
