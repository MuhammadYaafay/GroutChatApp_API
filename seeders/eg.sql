-- Insert sample users
INSERT INTO users (username, email, password, status)
VALUES 
('johndoe', 'john@example.com', '$2a$10$XFBu7RHRBKS0qKx5bZ6eEeWiLa.kj9voZk9yOvl2j6LzOQn3.k8Pe', 'online'), -- Password: password123
('janedoe', 'jane@example.com', '$2a$10$XFBu7RHRBKS0qKx5bZ6eEeWiLa.kj9voZk9yOvl2j6LzOQn3.k8Pe', 'offline'), -- Password: password123
('sarahjohnson', 'sarah@example.com', '$2a$10$XFBu7RHRBKS0qKx5bZ6eEeWiLa.kj9voZk9yOvl2j6LzOQn3.k8Pe', 'online'); -- Password: password123

-- Insert sample channels
INSERT INTO channels (name, description, created_by)
VALUES 
('General', 'General discussion for everyone', 1),
('Random', 'Off-topic conversations', 1),
('Tech Talk', 'Discussions about technology', 2);

-- Add users to channels
INSERT INTO channel_members (channel_id, user_id, role)
VALUES 
(1, 1, 'admin'),
(1, 2, 'member'),
(1, 3, 'member'),
(2, 1, 'member'),
(2, 2, 'admin'),
(3, 2, 'admin'),
(3, 3, 'member');

-- Insert sample messages
INSERT INTO messages (content, sender_id, recipient_id, channel_id, is_read)
VALUES 
-- Direct messages between user 1 and 2
('Hey Jane, how are you?', 1, 2, NULL, TRUE),
('I''m good, thanks! How about you?', 2, 1, NULL, TRUE),
('Doing great! Working on a new project.', 1, 2, NULL, TRUE),
('Sounds exciting! What kind of project?', 2, 1, NULL, FALSE),

-- Direct messages between user 1 and 3
('Hi Sarah, did you see the meeting notes?', 1, 3, NULL, TRUE),
('Yes, I did. I''ll prepare the presentation.', 3, 1, NULL, FALSE),

-- Channel messages in General
('Welcome everyone to the General channel!', 1, NULL, 1, TRUE),
('Thanks for setting this up!', 2, NULL, 1, TRUE),
('Happy to be here!', 3, NULL, 1, TRUE),

-- Channel messages in Tech Talk
('What do you think about the new React 18 features?', 2, NULL, 3, TRUE),
('I love the new concurrent rendering capability!', 3, NULL, 3, TRUE);
