package com.genealogy.controller;

import com.genealogy.config.JwtUtil;
import com.genealogy.dto.LoginDTO;
import com.genealogy.dto.R;
import com.genealogy.dto.RegisterDTO;
import com.genealogy.entity.User;
import com.genealogy.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    public R<Map<String, Object>> register(@Valid @RequestBody RegisterDTO dto) {
        if (userService.findByUsername(dto.getUsername()) != null) {
            return R.fail("用户名已存在");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPasswordHash(userService.hashPassword(dto.getPassword()));
        user.setDisplayName(dto.getDisplayName());
        user.setRole(userService.hasAnyUser() ? "USER" : "ADMIN");
        userService.save(user);

        String token = jwtUtil.generate(user.getId(), user.getUsername(), user.getRole());

        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("user", toUserMap(user));
        return R.ok(data);
    }

    @PostMapping("/login")
    public R<Map<String, Object>> login(@Valid @RequestBody LoginDTO dto) {
        User user = userService.findByUsername(dto.getUsername());
        if (user == null || !userService.checkPassword(dto.getPassword(), user.getPasswordHash())) {
            return R.fail("用户名或密码错误");
        }

        String token = jwtUtil.generate(user.getId(), user.getUsername(), user.getRole());

        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("user", toUserMap(user));
        return R.ok(data);
    }

    @GetMapping("/me")
    public R<Map<String, Object>> me(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            return R.fail(401, "未登录");
        }
        String token = auth.substring(7);
        if (!jwtUtil.validate(token)) {
            return R.fail(401, "Token无效");
        }
        var claims = jwtUtil.parse(token);
        Long userId = Long.valueOf(claims.getSubject());
        User user = userService.getById(userId);
        if (user == null) {
            return R.fail(401, "用户不存在");
        }
        return R.ok(toUserMap(user));
    }

    private Map<String, Object> toUserMap(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("displayName", u.getDisplayName());
        m.put("role", u.getRole());
        return m;
    }
}
