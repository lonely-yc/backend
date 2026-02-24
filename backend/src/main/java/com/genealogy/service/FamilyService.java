package com.genealogy.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.genealogy.entity.Family;
import com.genealogy.entity.Person;
import com.genealogy.mapper.FamilyMapper;
import com.genealogy.mapper.PersonMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FamilyService extends ServiceImpl<FamilyMapper, Family> {

    private final PersonMapper personMapper;

    public List<Family> listAll() {
        List<Family> families = list(new LambdaQueryWrapper<Family>().orderByDesc(Family::getCreatedAt));
        for (Family f : families) {
            long cnt = personMapper.selectCount(
                new LambdaQueryWrapper<Person>().eq(Person::getFamilyId, f.getId()).eq(Person::getDeleted, 0)
            );
            f.setMemberCount((int) cnt);
        }
        return families;
    }

    public void refreshMemberCount(Long familyId) {
        if (familyId == null) return;
        Family f = getById(familyId);
        if (f == null) return;
        long cnt = personMapper.selectCount(
            new LambdaQueryWrapper<Person>().eq(Person::getFamilyId, familyId).eq(Person::getDeleted, 0)
        );
        f.setMemberCount((int) cnt);
        updateById(f);
    }
}
